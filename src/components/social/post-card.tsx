import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionButton } from "./reaction-button";
import { CommentSheet } from "./comment-sheet";
import type { FeedPost } from "@/lib/data/posts";

export function PostCard({ post }: { post: FeedPost }) {
  const media = post.media[0];

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <Avatar className="size-9">
          <AvatarImage src={post.user.avatarUrl ?? undefined} alt="" />
          <AvatarFallback>{post.user.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{post.user.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(post.createdAt, { addSuffix: true })}
          </p>
        </div>
      </div>

      {media ? (
        <div className="relative aspect-4/5 w-full bg-muted">
          <Image
            src={media.url}
            alt={post.caption ?? ""}
            fill
            sizes="(min-width: 768px) 480px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="space-y-2 p-4">
        <div className="flex items-center gap-4">
          <ReactionButton
            postId={post.id}
            initialReacted={post.viewerHasReacted}
            initialCount={post._count.reactions}
          />
          <CommentSheet postId={post.id} commentCount={post._count.comments} />
        </div>
        {post.caption ? (
          <p className="text-sm">
            <span className="font-medium">{post.user.name}</span> {post.caption}
          </p>
        ) : null}
      </div>
    </article>
  );
}
