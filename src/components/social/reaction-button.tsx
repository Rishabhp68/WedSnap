"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toggleReactionAction } from "@/lib/actions/reactions";
import { getPusherClient } from "@/lib/realtime/pusher-client";
import { feedChannel, FEED_EVENTS } from "@/lib/realtime/channels";
import { cn } from "@/lib/utils";

interface ReactionButtonProps {
  postId: string;
  weddingId: string;
  initialReacted: boolean;
  initialCount: number;
}

export function ReactionButton({ postId, weddingId, initialReacted, initialCount }: ReactionButtonProps) {
  const [reacted, setReacted] = useState(initialReacted);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  // Someone else reacting to this post updates the shared count live — only
  // the count is ever pushed; "did *I* react" stays local to this viewer.
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(feedChannel(weddingId));

    function handleReactionUpdated(payload: { postId: string; count: number }) {
      if (payload.postId === postId) setCount(payload.count);
    }

    channel.bind(FEED_EVENTS.REACTION_UPDATED, handleReactionUpdated);
    return () => {
      channel.unbind(FEED_EVENTS.REACTION_UPDATED, handleReactionUpdated);
    };
  }, [weddingId, postId]);

  function handleClick() {
    // Optimistic — a wedding's worth of guests tapping hearts should never
    // feel like it's waiting on a network round-trip.
    const next = !reacted;
    setReacted(next);
    setCount((c) => c + (next ? 1 : -1));

    startTransition(async () => {
      const result = await toggleReactionAction(postId);
      if (!result.ok) {
        setReacted(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
      aria-pressed={reacted}
      aria-label={reacted ? "Remove reaction" : "React with love"}
    >
      <motion.span
        whileTap={shouldReduceMotion ? undefined : { scale: 1.3 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <Heart className={cn("size-4", reacted && "fill-primary text-primary")} />
      </motion.span>
      {count}
    </button>
  );
}
