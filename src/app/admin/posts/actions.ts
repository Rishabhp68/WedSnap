"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";

function revalidateModerationPaths() {
  revalidatePath("/app");
  revalidatePath("/admin/posts");
}

// Soft-deleted (isDeleted: true) rather than hard-deleted — keeps the
// moderation action reversible at the database level and out of the feed
// immediately, without destroying the record.
export async function deletePostAction(postId: string): Promise<void> {
  const { wedding } = await requireAdmin();
  await prisma.post.updateMany({
    where: { id: postId, weddingId: wedding.id },
    data: { isDeleted: true },
  });
  revalidateModerationPaths();
}

export async function deleteCommentAction(commentId: string): Promise<void> {
  const { wedding } = await requireAdmin();
  await prisma.comment.updateMany({
    where: { id: commentId, post: { weddingId: wedding.id } },
    data: { isDeleted: true },
  });
  revalidateModerationPaths();
}
