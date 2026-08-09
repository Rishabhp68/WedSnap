import Image from "next/image";
import { CalendarPlus, Clock, MapPin, Shirt } from "lucide-react";
import type { Event } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { formatEventDate, formatEventTimeRange } from "@/lib/utils/dates";
import { buildGoogleCalendarUrl } from "@/lib/utils/calendar";

export function EventCard({ event, timezone }: { event: Event; timezone: string }) {
  const calendarUrl = buildGoogleCalendarUrl({
    title: event.name,
    description: event.description,
    location: event.venueAddress,
    start: event.startTime,
    end: event.endTime,
  });

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {event.imageUrl ? (
        <div className="relative h-44 w-full sm:h-52">
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent-foreground/70">
            {formatEventDate(event.date, timezone)}
          </p>
          <h3 className="font-display mt-1 text-2xl">{event.name}</h3>
        </div>

        {event.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        ) : null}

        <dl className="space-y-2 text-sm text-foreground/90">
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-accent-foreground/70" />
            <span>{formatEventTimeRange(event.startTime, event.endTime, timezone)}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-accent-foreground/70" />
            <span>
              {event.venueName}
              <span className="block text-muted-foreground">{event.venueAddress}</span>
            </span>
          </div>
          {event.dressCode ? (
            <div className="flex items-start gap-2.5">
              <Shirt className="mt-0.5 size-4 shrink-0 text-accent-foreground/70" />
              <span>{event.dressCode}</span>
            </div>
          ) : null}
        </dl>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {event.mapUrl ? (
            <Button size="sm" variant="secondary" className="rounded-full" asChild>
              <a href={event.mapUrl} target="_blank" rel="noopener noreferrer">
                <MapPin /> Directions
              </a>
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="rounded-full" asChild>
            <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
              <CalendarPlus /> Add to Calendar
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
