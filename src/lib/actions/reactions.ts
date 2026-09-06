"use server";

import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { toggleReactionSchema } from "@/lib/validation/reaction";
import { pusherServer } from "@/lib/realtime/pusher-server";
import { feedChannel, FEED_EVENTS } from "@/lib/realtime/channels";
import type { ReactionCounts, ReactionType } from "@/lib/reactions";

/**
 * Sets, switches, or clears the caller's reaction on a post:
 *   - tapping the same reaction again removes it
 *   - picking a different one switches it (one reaction per guest per post,
 *     enforced by the @@unique([postId, userId]) constraint)
 */
export async function toggleReactionAction(postId: string, type: string) {
  const { user, wedding } = await requireGuest();

  const parsed = toggleReactionSchema.safeParse({ postId, type });
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

  let viewerReaction: ReactionType | null;
  if (existing?.type === parsed.data.type) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    viewerReaction = null;
  } else if (existing) {
    await prisma.reaction.update({ where: { id: existing.id }, data: { type: parsed.data.type } });
    viewerReaction = parsed.data.type;
  } else {
    await prisma.reaction.create({
      data: { postId: post.id, userId: user.id, type: parsed.data.type },
    });
    viewerReaction = parsed.data.type;
  }

  // Only the shared tallies are broadcast — which reaction *I* left is
  // per-viewer and never something another guest's tap should change.
  const rows = await prisma.reaction.groupBy({
    by: ["type"],
    where: { postId: post.id },
    _count: { _all: true },
  });
  const counts: ReactionCounts = {};
  for (const row of rows) counts[row.type as ReactionType] = row._count._all;

  await pusherServer.trigger(feedChannel(wedding.id), FEED_EVENTS.REACTION_UPDATED, {
    postId: post.id,
    counts,
  });

  return { ok: true as const, viewerReaction, counts };
}
