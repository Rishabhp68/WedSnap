"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setLocationSharingAction } from "@/lib/actions/location";

export function LocationSharingToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const result = await setLocationSharingAction(next);
      if (!result.ok) {
        setEnabled(!next);
        toast.error("Couldn't update location sharing. Please try again.");
        return;
      }
      toast.success(next ? "Sharing your location on the wedding map." : "Location sharing turned off.");
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/60 text-accent-foreground">
          <MapPin className="size-4" />
        </span>
        <div>
          <Label htmlFor="location-sharing" className="text-sm font-medium">
            Share my location
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Let other guests see you on the wedding map while this is on.
          </p>
        </div>
      </div>
      <Switch id="location-sharing" checked={enabled} onCheckedChange={handleChange} disabled={isPending} />
    </div>
  );
}
