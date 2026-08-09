"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toggleReactionAction } from "@/lib/actions/reactions";
import { cn } from "@/lib/utils";

interface ReactionButtonProps {
  postId: string;
  initialReacted: boolean;
  initialCount: number;
}

export function ReactionButton({ postId, initialReacted, initialCount }: ReactionButtonProps) {
  const [reacted, setReacted] = useState(initialReacted);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

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
