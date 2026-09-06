"use client";

import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REPLAY_ENVELOPE_EVENT } from "./envelope-intro";

/**
 * Folds the invitation back into its envelope so the opening can be watched
 * again — the animation is the nicest thing on the page and it otherwise only
 * ever plays once per session.
 *
 * `className` exists because this sits on the invitation's own header on one
 * page and over the hero photograph on another, and the two need different
 * contrast to stay legible.
 */
export function ReplayEnvelopeButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      // The overlay it summons sits at z-100, so there's no state to sync
      // here: the button doesn't need to know whether the envelope is open.
      onClick={() => window.dispatchEvent(new Event(REPLAY_ENVELOPE_EVENT))}
      aria-label="Show the invitation envelope again"
      title="Show the invitation envelope again"
      className={cn("rounded-full text-muted-foreground hover:text-foreground", className)}
    >
      <Mail />
    </Button>
  );
}
