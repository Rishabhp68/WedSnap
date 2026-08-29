import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { MarkActivitySeen } from "@/components/social/mark-activity-seen";
import { requireGuest } from "@/lib/auth/current-guest";
import { getActivity } from "@/lib/data/notifications";
import { formatCompactTimestamp } from "@/lib/utils/dates";

export default async function NotificationsPage() {
  const { user, guest, wedding } = await requireGuest();
  const { items, unreadCount } = await getActivity(wedding.id, user.id, guest.notificationsSeenAt);

  return (
    <div className="mx-auto max-w-xl px-4 pt-safe pb-6">
      {/* Runs after render so the "new" highlights below are still visible on
          this pass — marking seen first would clear them before they're read. */}
      <MarkActivitySeen hasUnread={unreadCount > 0} />

      <div className="flex items-baseline justify-between pt-4">
        <h1 className="font-display text-2xl">Activity</h1>
        {unreadCount > 0 ? (
          <span className="text-xs font-medium text-primary">{unreadCount} new</span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Bell}
            title="Nothing yet."
            description="When other guests share a moment, you'll see it here."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-0.5">
          {items.map((item) => (
            <Link
              key={item.postId}
              href="/app"
              className={`flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-muted ${
                item.isNew ? "bg-accent/15" : ""
              }`}
            >
              <Avatar className="size-11 shrink-0">
                <AvatarImage src={item.actorAvatarUrl ?? undefined} alt="" />
                <AvatarFallback>{item.actorName.slice(0, 1)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-medium">{item.actorName}</span>
                  <span className="text-muted-foreground"> shared a moment</span>
                </p>
                {item.caption ? (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.caption}</p>
                ) : null}
              </div>

              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {formatCompactTimestamp(item.createdAt)}
              </span>

              {item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 shrink-0 rounded-lg object-cover"
                />
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
