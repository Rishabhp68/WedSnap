"use server";

import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { createCommentSchema } from "@/lib/validation/comment";

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
  return { ok: true as const, comment };
}
