"use server";

import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { toggleReactionSchema } from "@/lib/validation/reaction";

/**
 * Simple like/unlike toggle. The schema supports five reaction types for
 * later, but the UI only ever sends LOVE for now — one clear tap action is
 * simpler for guests who may not be technically savvy.
 */
export async function toggleReactionAction(postId: string) {
  const { user, wedding } = await requireGuest();

  const parsed = toggleReactionSchema.safeParse({ postId, type: "LOVE" });
  if (!parsed.success) return { ok: false as const };

  // postId arrives as a plain client-supplied argument, so confirm it's
  // actually a post in *this* wedding before touching it — the schema is
  // built to support multiple weddings even though this deployment only
  // serves one today.
  const post = await prisma.post.findFirst({
    where: { id: parsed.data.postId, weddingId: wedding.id },
    select: { id: true },
  });
  if (!post) return { ok: false as const };

  const existing = await prisma.reaction.findUnique({
    where: { postId_userId: { postId: post.id, userId: user.id } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return { ok: true as const, reacted: false };
  }

  await prisma.reaction.create({
    data: { postId: post.id, userId: user.id, type: parsed.data.type },
  });
  return { ok: true as const, reacted: true };
}
