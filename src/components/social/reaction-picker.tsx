"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { REACTION_META, REACTION_ORDER, type ReactionType } from "@/lib/reactions";
import { cn } from "@/lib/utils";

interface ReactionPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (type: ReactionType) => void;
  selected: ReactionType | null;
  className?: string;
}

/** The five-emoji tray revealed by long-pressing the reaction button or the photo. */
export function ReactionPicker({ open, onClose, onPick, selected, className }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Any tap outside (or Escape) dismisses the tray without reacting.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    // Deferred so the very press that opened the tray doesn't immediately close it.
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.div
      ref={ref}
      role="menu"
      aria-label="Choose a reaction"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "absolute bottom-full z-30 mb-2 flex gap-1 rounded-full border border-border bg-popover p-1.5 shadow-lg",
        className,
      )}
    >
      {REACTION_ORDER.map((type) => (
        <button
          key={type}
          type="button"
          // menuitemradio (not menuitem): exactly one reaction can be
          // selected at a time, which is what aria-checked communicates.
          role="menuitemradio"
          onClick={() => onPick(type)}
          aria-label={REACTION_META[type].label}
          aria-checked={selected === type}
          className={cn(
            "flex size-11 items-center justify-center rounded-full text-2xl transition-transform hover:scale-110 active:scale-95",
            selected === type && "bg-muted",
          )}
        >
          {REACTION_META[type].emoji}
        </button>
      ))}
    </motion.div>
  );
}
