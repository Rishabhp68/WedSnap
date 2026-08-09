"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { createPostSchema } from "@/lib/validation/post";

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
  await prisma.$transaction(async (tx) => {
    await tx.post.create({
      data: {
        weddingId: wedding.id,
        userId: user.id,
        caption: parsed.data.caption,
        media: {
          create: parsed.data.media.map((m, order) => ({ ...m, order })),
        },
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
  });

  revalidatePath("/app");
  redirect("/app");
}
