"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-config";
import { NotificationBell } from "@/components/social/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  weddingLabel: string;
  guestName: string;
  guestAvatarUrl: string | null;
  weddingId: string;
  currentUserId: string;
  unreadCount: number;
}

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  weddingLabel,
  guestName,
  guestAvatarUrl,
  weddingId,
  currentUserId,
  unreadCount,
}: AppShellProps) {
  const pathname = usePathname();
  const profileActive = isActive(pathname, "/app/profile");

  // Replaces Clerk's UserButton: the avatar is now the way into the profile
  // screen, which is where signing out lives.
  const profileLink = (
    <Link href="/app/profile" aria-label="Your profile" aria-current={profileActive ? "page" : undefined}>
      <Avatar
        className={cn(
          "size-8 ring-2 transition-colors",
          profileActive ? "ring-primary" : "ring-transparent",
        )}
      >
        <AvatarImage src={guestAvatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-xs">{guestName.slice(0, 1)}</AvatarFallback>
      </Avatar>
    </Link>
  );

  // Remounts the bell whenever the server-rendered count changes, so live
  // arrivals counted in its local state are dropped rather than added on top.
  const bell = (
    <NotificationBell
      key={unreadCount}
      weddingId={weddingId}
      currentUserId={currentUserId}
      initialUnreadCount={unreadCount}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/40 md:sticky md:top-0 md:flex md:h-dvh md:flex-col">
        <div className="flex items-center justify-between gap-2 px-6 py-6">
          <span className="font-display text-xl text-primary">{weddingLabel}</span>
          {bell}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/app/profile"
          className={cn(
            "flex items-center gap-3 border-t border-border px-6 py-4 transition-colors hover:bg-muted",
            profileActive && "bg-muted",
          )}
        >
          <Avatar className="size-8">
            <AvatarImage src={guestAvatarUrl ?? undefined} alt="" />
            <AvatarFallback className="text-xs">{guestName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{guestName}</p>
          </div>
        </Link>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-4 pt-safe backdrop-blur-md md:hidden">
        <span className="font-display py-3 text-lg text-primary">{weddingLabel}</span>
        <div className="flex items-center gap-2">
          {bell}
          {profileLink}
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md safe-bottom-nav md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const isCreate = item.href === "/app/camera";
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium"
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full transition-colors",
                    isCreate
                      ? "-mt-6 size-14 bg-primary text-primary-foreground shadow-lg"
                      : "size-9",
                    !isCreate && active && "text-primary",
                    !isCreate && !active && "text-muted-foreground",
                  )}
                >
                  <item.icon className={isCreate ? "size-6" : "size-5"} />
                </span>
                <span className={cn(active ? "text-primary" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
