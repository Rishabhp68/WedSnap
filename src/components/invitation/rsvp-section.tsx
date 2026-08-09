import { Reveal } from "@/components/motion/reveal";
import { RsvpGate } from "./rsvp-gate";

export function RsvpSection() {
  return (
    <section id="rsvp" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-lg px-6 sm:px-8">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-accent-foreground/70">
            RSVP
          </p>
          <h2 className="font-display mt-3 text-center text-3xl sm:text-4xl">
            Will you celebrate with us?
          </h2>
          <p className="mt-3 text-center text-sm text-muted-foreground sm:text-base">
            Kindly let us know by responding below.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <RsvpGate />
        </Reveal>
      </div>
    </section>
  );
}
