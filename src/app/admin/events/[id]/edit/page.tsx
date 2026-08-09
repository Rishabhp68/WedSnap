import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { EventForm } from "@/components/admin/event-form";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await requireAdmin();
  const event = await prisma.event.findFirst({ where: { id, weddingId: wedding.id } });
  if (!event) notFound();

  const tz = wedding.timezone;

  return (
    <div className="max-w-xl">
      <h2 className="font-display text-2xl">Edit event</h2>
      <div className="mt-6">
        <EventForm
          defaults={{
            id: event.id,
            name: event.name,
            description: event.description ?? undefined,
            date: formatInTimeZone(event.date, tz, "yyyy-MM-dd"),
            startTime: formatInTimeZone(event.startTime, tz, "yyyy-MM-dd'T'HH:mm"),
            endTime: event.endTime ? formatInTimeZone(event.endTime, tz, "yyyy-MM-dd'T'HH:mm") : undefined,
            venueName: event.venueName,
            venueAddress: event.venueAddress,
            dressCode: event.dressCode ?? undefined,
            imageUrl: event.imageUrl ?? undefined,
            mapUrl: event.mapUrl ?? undefined,
            order: event.order,
          }}
        />
      </div>
    </div>
  );
}
