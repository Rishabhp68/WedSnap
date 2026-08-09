import { requireAdmin } from "@/lib/auth/current-guest";
import { EventForm } from "@/components/admin/event-form";

export default async function NewEventPage() {
  await requireAdmin();
  return (
    <div className="max-w-xl">
      <h2 className="font-display text-2xl">Add event</h2>
      <div className="mt-6">
        <EventForm />
      </div>
    </div>
  );
}
