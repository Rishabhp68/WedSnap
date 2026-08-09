import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-guest";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/wedding", label: "Wedding" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/timeline", label: "Our Story" },
  { href: "/admin/guests", label: "Guests" },
  { href: "/admin/rsvps", label: "RSVPs" },
  { href: "/admin/posts", label: "Moderation" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { wedding } = await requireAdmin();

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card/40 pt-safe">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
            <h1 className="font-display text-xl">
              {wedding.partnerOneName} &amp; {wedding.partnerTwoName}
            </h1>
          </div>
          <Link href="/app" className="text-sm text-muted-foreground hover:text-foreground">
            Back to app
          </Link>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-8">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
