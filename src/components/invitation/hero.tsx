import Image from "next/image";
import { MapPin } from "lucide-react";
import type { Wedding } from "@/generated/prisma/client";
import { formatEventDate } from "@/lib/utils/dates";
import { JoinCelebrationCta } from "./join-celebration-cta";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroProps {
  wedding: Wedding;
  /** Hides the "Explore Our Wedding" / "Join the Celebration" actions for contexts where the guest is already signed in. */
  showActions?: boolean;
  /**
   * Whether a venue exists further down the page. Gates the directions jump so
   * it can't point at a `#venue` anchor that VenueSection never rendered.
   */
  hasVenue?: boolean;
  /**
   * The public invitation gives the hero the rest of the first screen and
   * anchors the names to its bottom edge. Inside the app shell that's wrong: a
   * top bar and a fixed bottom nav already claim part of the screen, so a
   * viewport-height section that bottom-aligns pushes the couple's names below
   * what the guest can actually see. Embedded, the hero is shorter and centred.
   */
  fullHeight?: boolean;
}

export function Hero({
  wedding,
  showActions = true,
  hasVenue = false,
  fullHeight = true,
}: HeroProps) {
  return (
    // `overflow-hidden` sits on the background wrapper below, not here: on the
    // section it also clipped the heading, shaving the last glyph off a name
    // whose italic/serif side-bearing overhangs the line box.
    <section
      className={cn(
        "relative flex",
        fullHeight
          ? // Not min-h-dvh: the site header is sticky, so it takes flow space
            // and the hero starts *below* it. A full viewport height from that
            // origin overhangs the fold by exactly the header's height, taking
            // the bottom-anchored names and buttons under it with it.
            "min-h-[calc(100dvh-4rem-env(safe-area-inset-top))] items-end pb-14 sm:items-center sm:pb-0"
          : "min-h-[62svh] items-center py-14 sm:min-h-[70svh]",
      )}
    >
      <div className="absolute inset-0 overflow-hidden">
        {wedding.heroImageUrl ? (
          <Image
            src={wedding.heroImageUrl}
            alt={`${wedding.partnerOneName} and ${wedding.partnerTwoName}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-primary/30 to-primary/60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 sm:bg-gradient-to-t sm:from-black/70 sm:via-black/20 sm:to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-6 text-center text-white sm:px-8">
        <Reveal delay={0.05}>
          <p className="font-display text-sm uppercase tracking-[0.3em] text-white/80">
            We&apos;re getting married
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          {/* Each name is its own inline-block so a line break falls between
              names rather than mid-name, with break-words as the backstop for
              a single name too long for one line on a narrow phone. */}
          <h1 className="font-display mt-4 text-balance text-5xl leading-[1.1] break-words hyphens-none sm:text-7xl">
            <span className="inline-block">{wedding.partnerOneName}</span>
            <span className="mx-3 inline-block italic text-white/70">&amp;</span>
            <span className="inline-block">{wedding.partnerTwoName}</span>
          </h1>
        </Reveal>

        {wedding.tagline ? (
          <Reveal delay={0.25}>
            <p className="mx-auto mt-5 max-w-md text-balance text-base text-white/85 sm:text-lg">
              {wedding.tagline}
            </p>
          </Reveal>
        ) : null}

        <Reveal delay={0.32}>
          <p className="mt-6 text-sm font-medium tracking-wide text-white/90 sm:text-base">
            {formatEventDate(wedding.weddingDate, wedding.timezone)}
          </p>
        </Reveal>

        {showActions ? (
          <Reveal delay={0.4}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-full border-white/40 bg-white/10 px-6 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:w-auto"
                asChild
              >
                <a href="#our-story">Explore Our Wedding</a>
              </Button>
              <JoinCelebrationCta className="h-12 w-full rounded-full px-6 sm:w-auto" />
            </div>
          </Reveal>
        ) : null}

        {/* Deliberately a tier below the two CTAs rather than a third peer
            button: three equal full-width pills stacked on a phone swamp the
            hero. Still a 44px target, and it's the one thing guests come back
            to the invitation for once they've already RSVP'd — which is why
            it shows even when the CTAs above are hidden. */}
        {hasVenue ? (
          <Reveal delay={showActions ? 0.48 : 0.4}>
            <a
              href="#venue"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white"
            >
              <MapPin className="size-4" />
              Directions
            </a>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
