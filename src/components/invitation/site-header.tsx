import Link from "next/link";
import type { Wedding } from "@/generated/prisma/client";
import { JoinCelebrationCta } from "./join-celebration-cta";

const NAV_LINKS = [
  { href: "#our-story", label: "Our Story" },
  { href: "#events", label: "Events" },
  { href: "#venue", label: "Venue" },
  { href: "#rsvp", label: "RSVP" },
];

export function SiteHeader({ wedding }: { wedding: Wedding }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 pt-safe backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="font-display text-lg tracking-wide">
          {wedding.partnerOneName[0]}
          <span className="text-accent-foreground/60">&amp;</span>
          {wedding.partnerTwoName[0]}
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground sm:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <JoinCelebrationCta variant="secondary" className="h-9 rounded-full px-4 text-sm" />
      </div>
    </header>
  );
}
