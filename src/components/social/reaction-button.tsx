"use client";

import { Heart } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  REACTION_META,
  topReactionTypes,
  totalReactions,
  type ReactionCounts,
  type ReactionType,
} from "@/lib/reactions";
import { useLongPress } from "@/lib/hooks/use-long-press";
import { cn } from "@/lib/utils";

interface ReactionButtonProps {
  viewerReaction: ReactionType | null;
  counts: ReactionCounts;
  onTap: () => void;
  onLongPress: () => void;
}

/**
 * Presentational: the parent PostCard owns reaction state, because the photo
 * itself can open the same picker this button does.
 */
export function ReactionButton({ viewerReaction, counts, onTap, onLongPress }: ReactionButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const longPress = useLongPress({ onLongPress, onTap });
  const total = totalReactions(counts);

  // One cluster, never the same emoji twice: the viewer's own reaction leads
  // (it's already counted in `counts`), then the next most-used types.
  const others = topReactionTypes(counts).filter((type) => type !== viewerReaction);
  const shown = (viewerReaction ? [viewerReaction, ...others] : others).slice(0, 3);

  return (
    <button
      type="button"
      {...longPress}
      className="flex touch-none items-center gap-1.5 text-sm text-muted-foreground select-none"
      aria-pressed={viewerReaction !== null}
      aria-label={
        viewerReaction
          ? `${REACTION_META[viewerReaction].label} — tap to remove, hold to change`
          : "React — tap to love, hold for more reactions"
      }
    >
      {shown.length > 0 ? (
        <span className="flex items-center gap-0.5">
          {shown.map((type) => (
            <motion.span
              key={type}
              initial={shouldReduceMotion ? false : { scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className={cn(
                "text-base leading-none",
                // Your own reaction sits slightly proud of the rest.
                type === viewerReaction && "drop-shadow-sm",
              )}
            >
              {REACTION_META[type].emoji}
            </motion.span>
          ))}
        </span>
      ) : (
        <Heart className="size-4" />
      )}

      <span className={cn(viewerReaction && "font-medium text-foreground")}>{total}</span>
    </button>
  );
}
