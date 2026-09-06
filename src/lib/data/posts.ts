import { prisma } from "@/lib/db/client";
import { resolveMediaUrl } from "@/lib/storage/resolve";
import type { ReactionCounts, ReactionType } from "@/lib/reactions";

const POST_INCLUDE = (viewerId: string) => ({
  user: { select: { id: true, name: true, avatarUrl: true } },
  media: { orderBy: { order: "asc" as const } },
  _count: { select: { comments: true } },
  reactions: { where: { userId: viewerId }, select: { type: true }, take: 1 },
});

const PAGE_SIZE = 6;

/**
 * Per-type reaction tallies for a whole page of posts in one grouped query —
 * counting per post would be an N+1 as soon as the feed has any depth.
 */
async function getReactionCounts(postIds: string[]): Promise<Map<string, ReactionCounts>> {
  if (postIds.length === 0) return new Map();

  const rows = await prisma.reaction.groupBy({
    by: ["postId", "type"],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });

  const byPost = new Map<string, ReactionCounts>();
  for (const row of rows) {
    const counts = byPost.get(row.postId) ?? {};
    counts[row.type as ReactionType] = row._count._all;
    byPost.set(row.postId, counts);
  }
  return byPost;
}

/**
 * Cursor-paginated feed, newest first. Cursor-based (not offset/page
 * number) so pagination stays correct even as new posts land while a guest
 * is scrolling — no skipped or duplicated posts.
 */
export async function getFeedPostsPage(weddingId: string, viewerId: string, cursor?: string) {
  const posts = await prisma.post.findMany({
    where: { weddingId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: POST_INCLUDE(viewerId),
  });

  const hasMore = posts.length > PAGE_SIZE;
  const page = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  const reactionCounts = await getReactionCounts(page.map((p) => p.id));

  return {
    posts: page.map(({ reactions, ...post }) => ({
      ...post,
      media: post.media.map((m) => ({ ...m, url: resolveMediaUrl(m, { width: 1080 }) })),
      // Which reaction *this* viewer left, so the button can show their own
      // emoji back to them; null means they haven't reacted.
      viewerReaction: (reactions[0]?.type as ReactionType | undefined) ?? null,
      reactionCounts: reactionCounts.get(post.id) ?? {},
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export type FeedPost = Awaited<ReturnType<typeof getFeedPostsPage>>["posts"][number];
