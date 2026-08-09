"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitRsvpAction, type RsvpActionState } from "@/app/(public)/actions";

type RsvpStatus = "ATTENDING" | "MAYBE" | "NOT_ATTENDING";

const STATUS_OPTIONS: { value: RsvpStatus; label: string; emoji: string }[] = [
  { value: "ATTENDING", label: "Joyfully Attending", emoji: "🎉" },
  { value: "MAYBE", label: "Maybe", emoji: "🤔" },
  { value: "NOT_ATTENDING", label: "Can't Make It", emoji: "💌" },
];

const initialState: RsvpActionState = { ok: false };

export function RsvpForm({ initialStatus }: { initialStatus?: RsvpStatus | null }) {
  const [status, setStatus] = useState<RsvpStatus | null>(initialStatus ?? null);
  const [guestCount, setGuestCount] = useState(1);
  const [state, formAction, isPending] = useActionState(submitRsvpAction, initialState);

  useEffect(() => {
    if (state.ok) toast.success("Your RSVP has been saved. Thank you!");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="status" value={status ?? ""} />

      <div className="grid gap-3 sm:grid-cols-3">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            aria-pressed={status === option.value}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-4 py-4 text-sm font-medium transition-colors",
              status === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50",
            )}
          >
            <span className="text-xl leading-none">{option.emoji}</span>
            {option.label}
          </button>
        ))}
      </div>

      {status && status !== "NOT_ATTENDING" ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3">
          <span className="text-sm font-medium">Guests attending</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
              className="flex size-10 items-center justify-center rounded-full border border-border disabled:opacity-40"
              disabled={guestCount <= 1}
              aria-label="Decrease guest count"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center text-base tabular-nums">{guestCount}</span>
            <button
              type="button"
              onClick={() => setGuestCount((c) => Math.min(10, c + 1))}
              className="flex size-10 items-center justify-center rounded-full border border-border disabled:opacity-40"
              disabled={guestCount >= 10}
              aria-label="Increase guest count"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <input type="hidden" name="guestCount" value={guestCount} />
        </div>
      ) : null}

      <div>
        <Textarea
          name="message"
          placeholder="Leave a note for the couple (optional)"
          rows={3}
          className="resize-none rounded-2xl"
          maxLength={500}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full rounded-full"
        disabled={!status || isPending}
      >
        {isPending ? "Saving..." : "Send RSVP"}
      </Button>
    </form>
  );
}
