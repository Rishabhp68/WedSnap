"use client";

import { useEffect, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Send } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { addCommentAction, getPostCommentsAction } from "@/lib/actions/comments";
import { EmptyState } from "@/components/shared/empty-state";
import { getPusherClient } from "@/lib/realtime/pusher-client";
import { feedChannel, FEED_EVENTS } from "@/lib/realtime/channels";

type Comment = Awaited<ReturnType<typeof getPostCommentsAction>>[number];

export function CommentSheet({
  postId,
  weddingId,
  commentCount,
}: {
  postId: string;
  weddingId: string;
  commentCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [count, setCount] = useState(commentCount);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && comments === null) {
      getPostCommentsAction(postId).then(setComments);
    }
  }, [open, comments, postId]);

  // Live updates from anyone commenting on this post — dedupes by id so the
  // sender's own comment (already appended from the action's return value
  // below) never doubles up when its own broadcast echoes back.
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(feedChannel(weddingId));

    function handleCommentAdded(payload: { postId: string; count: number; comment: Comment }) {
      if (payload.postId !== postId) return;
      setCount(payload.count);
      setComments((prev) => {
        if (prev === null) return prev;
        if (prev.some((c) => c.id === payload.comment.id)) return prev;
        return [...prev, payload.comment];
      });
    }

    channel.bind(FEED_EVENTS.COMMENT_ADDED, handleCommentAdded);
    return () => {
      channel.unbind(FEED_EVENTS.COMMENT_ADDED, handleCommentAdded);
    };
  }, [weddingId, postId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");

    startTransition(async () => {
      const result = await addCommentAction(postId, content);
      if (result.ok) {
        // Must dedupe by id here as well as in the Pusher handler: the
        // broadcast routinely lands before this action resolves, and an
        // unconditional append is what showed the sender their own comment
        // twice.
        setComments((prev) => {
          const list = prev ?? [];
          if (list.some((c) => c.id === result.comment.id)) return list;
          return [...list, result.comment];
        });
        setCount(result.count);
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <MessageCircle className="size-4" />
        {count}
      </button>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Comments</DrawerTitle>
        </DrawerHeader>

        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {comments === null ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : comments.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No comments yet" description="Be the first to say something." />
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={comment.user.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{comment.user.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{comment.user.name}</span> {comment.content}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3 pb-safe">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            maxLength={500}
            className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <Button type="submit" size="icon" className="size-10 shrink-0 rounded-full" disabled={isPending || !text.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
