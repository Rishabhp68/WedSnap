import type { Event } from "@/generated/prisma/client";
import { EventCard } from "./event-card";
import { Reveal } from "@/components/motion/reveal";

export function EventsSection({ events, timezone }: { events: Event[]; timezone: string }) {
  if (events.length === 0) return null;

  return (
    <section id="events" className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-accent-foreground/70">
            Schedule
          </p>
          <h2 className="font-display mt-3 text-center text-3xl sm:text-4xl">Wedding Events</h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {events.map((event, i) => (
            <Reveal key={event.id} delay={(i % 2) * 0.1}>
              <EventCard event={event} timezone={timezone} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
