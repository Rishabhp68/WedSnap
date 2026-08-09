import { prisma } from "@/lib/db/client";
import { resolveMediaUrl } from "@/lib/storage/resolve";

const POST_INCLUDE = (viewerId: string) => ({
  user: { select: { id: true, name: true, avatarUrl: true } },
  media: { orderBy: { order: "asc" as const } },
  _count: { select: { comments: true, reactions: true } },
  reactions: { where: { userId: viewerId }, select: { type: true }, take: 1 },
});

function shapePost<T extends { media: { storageKey: string; url: string; mediaType: "IMAGE" | "VIDEO" }[]; reactions: { type: string }[] }>(
  post: T,
) {
  const { reactions, ...rest } = post;
  return {
    ...rest,
    media: post.media.map((m) => ({ ...m, url: resolveMediaUrl(m, { width: 1080 }) })),
    viewerHasReacted: reactions.length > 0,
  };
}

const PAGE_SIZE = 6;

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

  return {
    posts: page.map(shapePost),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export type FeedPost = Awaited<ReturnType<typeof getFeedPostsPage>>["posts"][number];
