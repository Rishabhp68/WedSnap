"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { createPostSchema } from "@/lib/validation/post";
import { resolveMediaUrl } from "@/lib/storage/resolve";
import { pusherServer } from "@/lib/realtime/pusher-server";
import { feedChannel, FEED_EVENTS } from "@/lib/realtime/channels";
import { sendPushToWedding } from "@/lib/push/server";

export interface CreatePostState {
  ok: boolean;
  error?: string;
}

export async function createPostAction(
  _prevState: CreatePostState | null,
  formData: FormData,
): Promise<CreatePostState> {
  const { user, wedding } = await requireGuest();

  const rawMedia = formData.get("media");
  let media: unknown;
  try {
    media = JSON.parse(typeof rawMedia === "string" ? rawMedia : "[]");
  } catch {
    return { ok: false, error: "Something went wrong with that photo. Please try again." };
  }

  const parsed = createPostSchema.safeParse({
    caption: formData.get("caption") || undefined,
    media,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please try again." };
  }

  const firstImage = parsed.data.media.find((m) => m.mediaType === "IMAGE");

  // A shared moment shows up two places at once — the permanent feed and
  // the 24h "Wedding Moments" story rail — so both need to exist atomically;
  // a partial write would either drop the post or leave an orphaned story.
  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        weddingId: wedding.id,
        userId: user.id,
        caption: parsed.data.caption,
        media: {
          create: parsed.data.media.map((m, order) => ({ ...m, order })),
        },
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        media: { orderBy: { order: "asc" } },
      },
    });

    if (firstImage) {
      await tx.story.create({
        data: {
          weddingId: wedding.id,
          userId: user.id,
          storageKey: firstImage.storageKey,
          mediaUrl: firstImage.url,
          mediaType: firstImage.mediaType,
          caption: parsed.data.caption,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    return created;
  });

  // Every other guest currently on the feed gets this pushed to them live —
  // no one has to pull-to-refresh to see a moment as it's shared.
  await pusherServer.trigger(feedChannel(wedding.id), FEED_EVENTS.NEW_POST, {
    ...post,
    media: post.media.map((m) => ({ ...m, url: resolveMediaUrl(m, { width: 1080 }) })),
    _count: { comments: 0 },
    // Brand new post: nobody has reacted yet, including whoever receives this.
    viewerReaction: null,
    reactionCounts: {},
  });

  // Rings every other guest's phone. Deliberately after the Pusher trigger and
  // wrapped: a push service being slow or down must not fail the post, which
  // is already committed by this point.
  try {
    await sendPushToWedding(wedding.id, user.id, {
      title: `${user.name} shared a moment`,
      body: parsed.data.caption?.slice(0, 120) || "Tap to see the latest from the wedding.",
      url: "/app",
      tag: "new-post",
    });
  } catch {
    // Notification delivery is best-effort; the post itself succeeded.
  }

  revalidatePath("/app");
  redirect("/app");
}
