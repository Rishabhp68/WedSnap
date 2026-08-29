import Image from "next/image";
import { Play } from "lucide-react";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { resolveMediaPosterUrl, resolveMediaUrl } from "@/lib/storage/resolve";
import { DeleteButton } from "@/components/admin/delete-button";
import { formatDistanceToNow } from "date-fns";
import { deleteCommentAction, deletePostAction } from "./actions";

export default async function AdminPostsPage() {
  const { wedding } = await requireAdmin();
  const posts = await prisma.post.findMany({
    where: { weddingId: wedding.id, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true } },
      media: { orderBy: { order: "asc" }, take: 1 },
      comments: {
        where: { isDeleted: false },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
      _count: { select: { reactions: true } },
    },
  });

  return (
    <div>
      <h2 className="font-display text-2xl">Moderate posts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Showing the {posts.length} most recent posts. Deleted items are hidden from the feed immediately.
      </p>

      <div className="mt-6 space-y-4">
        {posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          posts.map((post) => {
            const media = post.media[0];
            return (
              <div key={post.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                {media ? (
                  // Always an <img>: a video URL through next/image can't
                  // decode and renders as a broken-image placeholder, so
                  // videos are thumbnailed from an extracted frame instead.
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={resolveMediaPosterUrl(media, { width: 160 })}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    {media.mediaType === "VIDEO" ? (
                      // One frame isn't enough to moderate a clip on, so the
                      // thumbnail opens the full video.
                      <a
                        href={resolveMediaUrl(media, { width: 720 })}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Play video"
                        className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors hover:bg-black/50"
                      >
                        <Play className="size-6 fill-white text-white" />
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{post.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(post.createdAt, { addSuffix: true })} &middot;{" "}
                        {post._count.reactions} reactions
                      </p>
                      {post.caption ? <p className="mt-1 text-sm">{post.caption}</p> : null}
                    </div>
                    <DeleteButton
                      action={deletePostAction.bind(null, post.id)}
                      confirmMessage="Delete this post? It will disappear from the feed."
                    />
                  </div>

                  {post.comments.length > 0 ? (
                    <div className="mt-3 space-y-1.5 border-t border-border pt-2">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{comment.user.name}</span>{" "}
                            {comment.content}
                          </p>
                          <DeleteButton
                            action={deleteCommentAction.bind(null, comment.id)}
                            confirmMessage="Delete this comment?"
                            label=""
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
