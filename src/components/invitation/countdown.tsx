"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const UNITS: Array<{ key: keyof TimeLeft; label: string }> = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
];

/**
 * `weddingDate` is an absolute UTC instant, so `target.getTime() - Date.now()`
 * is correct for every guest regardless of which timezone their phone is in
 * — no timezone math needed on the client at all.
 */
export function Countdown({ weddingDate }: { weddingDate: Date }) {
  const target = new Date(weddingDate);
  // Avoid a hydration mismatch: render nothing time-dependent until mounted,
  // then compute the real countdown client-side.
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    // Intentional: this is the initial read of an external clock, not a
    // derived-state update — the whole point is to skip it during SSR/the
    // first client render (see the comment above) and only sync once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(getTimeLeft(target));
    const interval = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.getTime()]);

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4" aria-live="off">
      {UNITS.map(({ key, label }) => (
        <div
          key={key}
          className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/70 px-2 py-4 shadow-sm sm:py-6"
        >
          <span className="font-display text-3xl tabular-nums text-primary sm:text-5xl">
            {timeLeft ? String(timeLeft[key]).padStart(2, "0") : "—"}
          </span>
          <span className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground sm:text-xs">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
