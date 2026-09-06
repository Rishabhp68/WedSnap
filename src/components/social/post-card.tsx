"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionButton } from "./reaction-button";
import { ReactionPicker } from "./reaction-picker";
import { CommentSheet } from "./comment-sheet";
import { FeedVideo } from "./feed-video";
import { toggleReactionAction } from "@/lib/actions/reactions";
import { getPusherClient } from "@/lib/realtime/pusher-client";
import { feedChannel, FEED_EVENTS } from "@/lib/realtime/channels";
import { DEFAULT_REACTION, type ReactionCounts, type ReactionType } from "@/lib/reactions";
import { useLongPress } from "@/lib/hooks/use-long-press";
import type { FeedPost } from "@/lib/data/posts";

export function PostCard({ post, weddingId }: { post: FeedPost; weddingId: string }) {
  const media = post.media[0];
  const [viewerReaction, setViewerReaction] = useState<ReactionType | null>(post.viewerReaction);
  const [counts, setCounts] = useState<ReactionCounts>(post.reactionCounts);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Everyone else's reactions land here live. Absolute tallies from the
  // server, so an optimistic local guess self-corrects instead of drifting.
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(feedChannel(weddingId));

    function handleReactionUpdated(payload: { postId: string; counts: ReactionCounts }) {
      if (payload.postId === post.id) setCounts(payload.counts);
    }

    channel.bind(FEED_EVENTS.REACTION_UPDATED, handleReactionUpdated);
    return () => {
      channel.unbind(FEED_EVENTS.REACTION_UPDATED, handleReactionUpdated);
    };
  }, [weddingId, post.id]);

  function react(type: ReactionType) {
    setPickerOpen(false);

    // Optimistic: tapping the reaction you already left clears it, any other
    // choice replaces it — one reaction per guest per post.
    const previous = viewerReaction;
    const next = previous === type ? null : type;
    setViewerReaction(next);
    setCounts((current) => {
      const updated = { ...current };
      if (previous) updated[previous] = Math.max(0, (updated[previous] ?? 1) - 1);
      if (next) updated[next] = (updated[next] ?? 0) + 1;
      return updated;
    });

    startTransition(async () => {
      const result = await toggleReactionAction(post.id, type);
      if (result.ok) {
        setViewerReaction(result.viewerReaction);
        setCounts(result.counts);
      } else {
        setViewerReaction(previous);
      }
    });
  }

  // Long-pressing the photo opens the same tray as long-pressing the button.
  const mediaLongPress = useLongPress({ onLongPress: () => setPickerOpen(true) });

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
        media.mediaType === "VIDEO" ? (
          <FeedVideo src={media.url} caption={post.caption ?? ""} />
        ) : (
          <div
            {...mediaLongPress}
            className="relative aspect-4/5 w-full touch-pan-y bg-muted select-none [-webkit-touch-callout:none]"
          >
            <Image
              src={media.url}
              alt={post.caption ?? ""}
              fill
              sizes="(min-width: 768px) 480px, 100vw"
              className="pointer-events-none object-cover"
            />
          </div>
        )
      ) : null}

      <div className="space-y-2 p-4">
        <div className="relative flex items-center gap-4">
          <ReactionPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={react}
            selected={viewerReaction}
            className="left-0"
          />
          <ReactionButton
            viewerReaction={viewerReaction}
            counts={counts}
            onTap={() => react(viewerReaction ?? DEFAULT_REACTION)}
            onLongPress={() => setPickerOpen(true)}
          />
          <CommentSheet postId={post.id} weddingId={weddingId} commentCount={post._count.comments} />
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
