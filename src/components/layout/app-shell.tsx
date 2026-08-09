"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  weddingLabel: string;
  guestName: string;
  guestAvatarUrl: string | null;
}

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, weddingLabel, guestName, guestAvatarUrl }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/40 md:flex md:flex-col">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="font-display text-xl text-primary">{weddingLabel}</span>
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
        <div className="flex items-center gap-3 border-t border-border px-6 py-4">
          <UserButton />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{guestName}</p>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-4 pt-safe backdrop-blur-md md:hidden">
        <span className="font-display py-3 text-lg text-primary">{weddingLabel}</span>
        <div className="flex items-center gap-3">
          {guestAvatarUrl ? (
            <Image
              src={guestAvatarUrl}
              alt=""
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : null}
          <UserButton />
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
