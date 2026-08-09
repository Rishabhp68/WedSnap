import type { Wedding } from "@/generated/prisma/client";
import { Countdown } from "./countdown";
import { Reveal } from "@/components/motion/reveal";
import { formatFullDateTime } from "@/lib/utils/dates";

export function CountdownSection({ wedding }: { wedding: Wedding }) {
  return (
    <section id="schedule" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-6 text-center sm:px-8">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-foreground/70">
            Save the Date
          </p>
          <h2 className="font-display mt-3 text-3xl sm:text-4xl">
            Counting down until we say &ldquo;I do&rdquo;
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            {formatFullDateTime(wedding.weddingDate, wedding.timezone)}
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <Countdown weddingDate={wedding.weddingDate} />
        </Reveal>
      </div>
    </section>
  );
}
