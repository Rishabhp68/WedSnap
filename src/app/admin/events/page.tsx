import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { formatEventDate, formatEventTimeRange } from "@/lib/utils/dates";
import { deleteEventAction } from "./actions";

export default async function AdminEventsPage() {
  const { wedding } = await requireAdmin();
  const events = await prisma.event.findMany({
    where: { weddingId: wedding.id },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Events</h2>
        <Button asChild size="sm" className="rounded-full">
          <Link href="/admin/events/new">
            <Plus /> Add event
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-medium">{event.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatEventDate(event.date, wedding.timezone)} &middot;{" "}
                {formatEventTimeRange(event.startTime, event.endTime, wedding.timezone)}
              </p>
              <p className="text-sm text-muted-foreground">{event.venueName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/admin/events/${event.id}/edit`}>Edit</Link>
              </Button>
              <DeleteButton
                action={deleteEventAction.bind(null, event.id)}
                confirmMessage={`Delete "${event.name}"? This can't be undone.`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
