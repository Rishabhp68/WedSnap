import Image from "next/image";
import type { Wedding } from "@/generated/prisma/client";
import { formatEventDate } from "@/lib/utils/dates";
import { JoinCelebrationCta } from "./join-celebration-cta";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export function Hero({ wedding }: { wedding: Wedding }) {
  return (
    <section className="relative flex min-h-dvh items-end overflow-hidden pb-16 pt-safe sm:items-center sm:pb-0">
      <div className="absolute inset-0">
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
          <h1 className="font-display mt-4 text-balance text-5xl leading-[1.1] sm:text-7xl">
            {wedding.partnerOneName}
            <span className="mx-3 italic text-white/70">&amp;</span>
            {wedding.partnerTwoName}
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
      </div>
    </section>
  );
}
