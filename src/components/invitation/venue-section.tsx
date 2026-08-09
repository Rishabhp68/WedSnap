import { Info, Navigation, ParkingCircle } from "lucide-react";
import type { Venue } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

export function VenueSection({ venue }: { venue: Venue | null }) {
  if (!venue) return null;

  const directionsUrl =
    venue.mapUrl ?? `https://maps.google.com/?q=${encodeURIComponent(venue.address)}`;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(venue.address)}&output=embed`;

  return (
    <section id="venue" className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6 sm:px-8">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-accent-foreground/70">
            Getting There
          </p>
          <h2 className="font-display mt-3 text-center text-3xl sm:text-4xl">{venue.name}</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground sm:text-base">{venue.address}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 overflow-hidden rounded-3xl border border-border shadow-sm">
            <iframe
              title={`Map to ${venue.name}`}
              src={embedUrl}
              className="h-64 w-full sm:h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Reveal>

        {/* Sticky, thumb-friendly directions CTA — this is the one action
            most guests need on the go, so it stays reachable with one tap. */}
        <Reveal delay={0.15}>
          <Button size="lg" className="mt-6 h-12 w-full rounded-full px-8 sm:w-auto" asChild>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation /> Get Directions
            </a>
          </Button>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {venue.parkingInfo ? (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ParkingCircle className="size-4 text-accent-foreground/70" />
                  Parking
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{venue.parkingInfo}</p>
              </div>
            ) : null}
            {venue.instructions ? (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="size-4 text-accent-foreground/70" />
                  Good to know
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{venue.instructions}</p>
              </div>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
