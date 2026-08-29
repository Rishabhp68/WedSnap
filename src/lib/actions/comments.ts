"use server";

import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { createCommentSchema } from "@/lib/validation/comment";
import { pusherServer } from "@/lib/realtime/pusher-server";
import { feedChannel, FEED_EVENTS } from "@/lib/realtime/channels";

export async function getPostCommentsAction(postId: string) {
  const { wedding } = await requireGuest();
  return prisma.comment.findMany({
    where: { postId, isDeleted: false, post: { weddingId: wedding.id } },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

export async function addCommentAction(postId: string, content: string) {
  const { user, wedding } = await requireGuest();

  const parsed = createCommentSchema.safeParse({ postId, content });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Please try again." };
  }

  // Same cross-tenant guard as reactions — postId is client-supplied.
  const post = await prisma.post.findFirst({
    where: { id: parsed.data.postId, weddingId: wedding.id },
    select: { id: true },
  });
  if (!post) {
    return { ok: false as const, error: "This post is no longer available." };
  }

  const comment = await prisma.comment.create({
    data: { postId: post.id, userId: user.id, content: parsed.data.content },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  const count = await prisma.comment.count({ where: { postId: post.id, isDeleted: false } });

  // Broadcasts the same `comment` object (same id) this action is about to
  // return to the sender — the sheet dedupes by id, so whichever of the two
  // arrives first "wins" and the other is a no-op instead of a duplicate.
  await pusherServer.trigger(feedChannel(wedding.id), FEED_EVENTS.COMMENT_ADDED, {
    postId: post.id,
    count,
    comment,
  });

  return { ok: true as const, comment };
}
