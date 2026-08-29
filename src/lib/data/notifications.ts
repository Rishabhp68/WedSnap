import { prisma } from "@/lib/db/client";
import { resolveMediaUrl } from "@/lib/storage/resolve";

const ACTIVITY_LIMIT = 50;

export interface ActivityItem {
  postId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
  isNew: boolean;
}

/**
 * New-post activity for one guest.
 *
 * Derived from Post rather than a per-recipient notification table: a post is
 * a broadcast to the whole wedding, so "who should know about it" is every
 * guest, and "have I seen it" is a single watermark on WeddingGuest. That
 * keeps posting O(1) writes instead of one row per guest.
 */
export async function getActivity(weddingId: string, userId: string, seenAt: Date | null) {
  const posts = await prisma.post.findMany({
    where: { weddingId, isDeleted: false, userId: { not: userId } },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_LIMIT,
    include: {
      user: { select: { name: true, avatarUrl: true } },
      media: { orderBy: { order: "asc" }, take: 1 },
    },
  });

  const items: ActivityItem[] = posts.map((post) => ({
    postId: post.id,
    actorName: post.user.name,
    actorAvatarUrl: post.user.avatarUrl,
    caption: post.caption,
    thumbnailUrl: post.media[0] ? resolveMediaUrl(post.media[0], { width: 160 }) : null,
    createdAt: post.createdAt,
    isNew: seenAt === null || post.createdAt > seenAt,
  }));

  return { items, unreadCount: items.filter((item) => item.isNew).length };
}

/** Badge count only — avoids loading the whole activity list on every page render. */
export async function getUnreadActivityCount(weddingId: string, userId: string, seenAt: Date | null) {
  return prisma.post.count({
    where: {
      weddingId,
      isDeleted: false,
      userId: { not: userId },
      ...(seenAt ? { createdAt: { gt: seenAt } } : {}),
    },
  });
}
