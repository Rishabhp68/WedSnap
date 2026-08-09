import type { Wedding } from "@/generated/prisma/client";
import { formatEventDate } from "@/lib/utils/dates";

export function SiteFooter({ wedding }: { wedding: Wedding }) {
  return (
    <footer className="border-t border-border/60 bg-background py-10 pb-safe">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-8">
        <p className="font-display text-xl">
          {wedding.partnerOneName} <span className="text-accent-foreground/60">&amp;</span>{" "}
          {wedding.partnerTwoName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatEventDate(wedding.weddingDate, wedding.timezone)}
        </p>
        <p className="mt-4 text-xs text-muted-foreground/70">
          Made with love for our family and friends.
        </p>
      </div>
    </footer>
  );
}
