"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getExistingSubscription,
  isIos,
  isStandalone,
  pushSupported,
  subscribeToPush,
} from "@/lib/push/client";
import { deletePushSubscriptionAction, savePushSubscriptionAction } from "@/lib/actions/push";

const FAILURE_MESSAGES: Record<string, string> = {
  denied:
    "Notifications are blocked for this site. Allow them in your browser's settings, then try again.",
  "ios-needs-install":
    "On iPhone, add WedSnap to your Home Screen first — Share → Add to Home Screen — then turn this on from there.",
  unsupported: "This browser doesn't support notifications.",
  misconfigured: "Notifications aren't set up on the server yet.",
  failed: "Couldn't turn on notifications. Please try again.",
};

export function NotificationToggle({ publicKey }: { publicKey?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  // The source of truth is the browser's own subscription, not anything we
  // store: a guest can revoke notification permission in system settings
  // without the app ever hearing about it.
  useEffect(() => {
    let cancelled = false;
    void getExistingSubscription().then((subscription) => {
      if (cancelled) return;
      setEnabled(Boolean(subscription) && Notification.permission === "granted");
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(next: boolean) {
    if (next) {
      startTransition(async () => {
        const result = await subscribeToPush(publicKey);
        if (!result.ok) {
          toast.error(FAILURE_MESSAGES[result.reason] ?? FAILURE_MESSAGES.failed);
          return;
        }
        const saved = await savePushSubscriptionAction(result.subscription);
        if (!saved.ok) {
          toast.error(FAILURE_MESSAGES.failed);
          return;
        }
        setEnabled(true);
        toast.success("Notifications on. You'll hear it when someone shares a moment.");
      });
      return;
    }

    startTransition(async () => {
      const subscription = await getExistingSubscription();
      if (subscription) {
        await deletePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEnabled(false);
      toast.success("Notifications turned off.");
    });
  }

  // iOS in a normal tab can't do push at all, so explain the one thing that
  // would fix it rather than offering a switch that always fails.
  const iosNeedsInstall = isIos() && !isStandalone();
  const unavailable = !pushSupported() && !iosNeedsInstall;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/60 text-accent-foreground">
          <Bell className="size-4" />
        </span>
        <div>
          <Label htmlFor="push-notifications" className="text-sm font-medium">
            Notify me on this device
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {iosNeedsInstall
              ? "On iPhone: tap Share, then Add to Home Screen, and turn this on from there."
              : unavailable
                ? "This browser doesn't support notifications."
                : "Ring this phone when someone shares a moment or messages you."}
          </p>
        </div>
      </div>
      <Switch
        id="push-notifications"
        checked={enabled}
        onCheckedChange={handleChange}
        disabled={isPending || !ready || unavailable}
      />
    </div>
  );
}
