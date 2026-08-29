"use client";

import { useEffect, useRef } from "react";
import { markActivitySeenAction } from "@/lib/actions/notifications";

/**
 * Clears the activity badge once the guest has actually opened the screen.
 *
 * Deliberately a post-render effect rather than a call inside the page's
 * server render: the list highlights what's new, so the watermark has to move
 * *after* that first paint, otherwise everything would already read as seen.
 */
export function MarkActivitySeen({ hasUnread }: { hasUnread: boolean }) {
  const done = useRef(false);

  useEffect(() => {
    if (!hasUnread || done.current) return;
    done.current = true;
    void markActivitySeenAction();
  }, [hasUnread]);

  return null;
}
