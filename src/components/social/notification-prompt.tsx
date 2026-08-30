"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isIos, isStandalone, pushSupported, subscribeToPush } from "@/lib/push/client";
import { savePushSubscriptionAction } from "@/lib/actions/push";

const DISMISSED_KEY = "wedsnap:push-prompt-dismissed";

/**
 * A one-time ask on the home feed.
 *
 * The toggle in the profile is the durable control, but almost nobody goes
 * looking for it, and notifications that were never enabled are exactly the
 * "not noticeable" complaint. This surfaces the ask once, where guests
 * actually are, and never nags again once answered or dismissed.
 */
/** Nothing here changes reactively — it's read once, after hydration. */
function subscribe() {
  return () => {};
}

function shouldPrompt() {
  if (!pushSupported()) return false;
  // Only "default" is worth asking about — "granted" is already done and
  // "denied" cannot be re-prompted from script, only from site settings.
  if (Notification.permission !== "default") return false;
  if (localStorage.getItem(DISMISSED_KEY)) return false;
  // iOS can't subscribe from a browser tab at all; the profile toggle
  // explains the Home Screen step rather than this banner failing.
  return !(isIos() && !isStandalone());
}

export function NotificationPrompt({ publicKey }: { publicKey?: string }) {
  // Read through useSyncExternalStore rather than an effect: these are browser
  // facts that don't exist during the server render, and the server snapshot
  // of `false` is what keeps hydration consistent.
  const canPrompt = useSyncExternalStore(subscribe, shouldPrompt, () => false);
  const [answered, setAnswered] = useState(false);
  const [isPending, startTransition] = useTransition();

  const visible = Boolean(publicKey) && canPrompt && !answered;
  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setAnswered(true);
  }

  function enable() {
    startTransition(async () => {
      const result = await subscribeToPush(publicKey);
      if (!result.ok) {
        // Whatever the outcome, don't ask again — a denied permission can
        // only be undone in browser settings.
        localStorage.setItem(DISMISSED_KEY, "1");
        setAnswered(true);
        if (result.reason === "denied") {
          toast.error("Notifications blocked. You can allow them in your browser's site settings.");
        }
        return;
      }
      await savePushSubscriptionAction(result.subscription);
      localStorage.setItem(DISMISSED_KEY, "1");
      setAnswered(true);
      toast.success("Notifications on. You'll hear it when someone shares a moment.");
    });
  }

  return (
    <div className="mx-4 mt-3 flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/60 text-accent-foreground">
        <Bell className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Don&apos;t miss a moment</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Get a notification when someone shares a photo or messages you.
        </p>
        <Button size="sm" className="mt-2.5 rounded-full" onClick={enable} disabled={isPending}>
          Turn on notifications
        </Button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
