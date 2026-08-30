"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { getPusherClient } from "@/lib/realtime/pusher-client";
import { feedChannel, FEED_EVENTS, userChannel, USER_EVENTS } from "@/lib/realtime/channels";
import { alertInApp } from "@/lib/push/alert";
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

  // Held in a ref so navigating between rooms doesn't resubscribe the whole
  // channel — the handler only needs the *current* path when an event lands.
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const client = getPusherClient();
    const channel = client.subscribe(feedChannel(weddingId));

    function handleNewPost(post: { userId?: string }) {
      // Your own post is not news to you.
      if (post?.userId === currentUserId) return;
      setCount((prev) => prev + 1);
      // The Web Push notification is suppressed while the app is focused, so
      // a badge alone was the entire signal — easy to miss. Chime and buzz.
      alertInApp();
    }

    channel.bind(FEED_EVENTS.NEW_POST, handleNewPost);

    // The guest's own channel: chat messages arriving while they're anywhere
    // in the app but not inside that conversation. Nothing else subscribes
    // here, so this one is safe to fully unsubscribe on cleanup.
    const personal = client.subscribe(userChannel(currentUserId));
    function handleDirectAlert(data: { roomId?: string }) {
      // Chiming at a message that just appeared on screen is noise — the room
      // you're reading is the one case where the arrival is already obvious.
      if (data?.roomId && pathnameRef.current === `/app/chat/${data.roomId}`) return;
      alertInApp();
    }
    personal.bind(USER_EVENTS.DIRECT_ALERT, handleDirectAlert);

    // Unbinds this handler only — the Feed shares the feed channel, and
    // `unsubscribe` would tear it down for that component too.
    return () => {
      channel.unbind(FEED_EVENTS.NEW_POST, handleNewPost);
      personal.unbind(USER_EVENTS.DIRECT_ALERT, handleDirectAlert);
      client.unsubscribe(userChannel(currentUserId));
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
