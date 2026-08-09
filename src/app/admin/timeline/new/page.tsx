import { requireAdmin } from "@/lib/auth/current-guest";
import { TimelineForm } from "@/components/admin/timeline-form";

export default async function NewTimelineMomentPage() {
  await requireAdmin();
  return (
    <div className="max-w-xl">
      <h2 className="font-display text-2xl">Add a moment</h2>
      <div className="mt-6">
        <TimelineForm />
      </div>
    </div>
  );
}
