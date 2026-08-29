"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getPusherClient } from "@/lib/realtime/pusher-client";
import { feedChannel, FEED_EVENTS } from "@/lib/realtime/channels";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  weddingId: string;
  currentUserId: string;
  initialUnreadCount: number;
  className?: string;
}

/**
 * Reuses the feed channel the post action already broadcasts on, so the badge
 * ticks up live without a second subscription or any polling.
 *
 * Mounted with `key={initialUnreadCount}` by the layout: when the server count
 * changes (e.g. after the activity screen marks everything seen) the component
 * remounts and drops any locally-counted arrivals, rather than adding the two
 * together and double-counting.
 */
export function NotificationBell({
  weddingId,
  currentUserId,
  initialUnreadCount,
  className,
}: NotificationBellProps) {
  const [count, setCount] = useState(initialUnreadCount);

  useEffect(() => {
    const client = getPusherClient();
    const channel = client.subscribe(feedChannel(weddingId));

    function handleNewPost(post: { userId?: string }) {
      // Your own post is not news to you.
      if (post?.userId === currentUserId) return;
      setCount((prev) => prev + 1);
    }

    channel.bind(FEED_EVENTS.NEW_POST, handleNewPost);
    // Unbinds this handler only — the Feed shares this channel, and
    // `unsubscribe` would tear it down for that component too.
    return () => {
      channel.unbind(FEED_EVENTS.NEW_POST, handleNewPost);
    };
  }, [weddingId, currentUserId]);

  return (
    <Link
      href="/app/notifications"
      aria-label={count > 0 ? `Activity, ${count} new` : "Activity"}
      className={cn(
        "relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Bell className="size-5" />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
