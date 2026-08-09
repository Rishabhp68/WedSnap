import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { TimelineForm } from "@/components/admin/timeline-form";

export default async function EditTimelineMomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await requireAdmin();
  const moment = await prisma.timelineMoment.findFirst({ where: { id, weddingId: wedding.id } });
  if (!moment) notFound();

  return (
    <div className="max-w-xl">
      <h2 className="font-display text-2xl">Edit moment</h2>
      <div className="mt-6">
        <TimelineForm
          defaults={{
            id: moment.id,
            title: moment.title,
            description: moment.description,
            date: moment.date ? format(moment.date, "yyyy-MM-dd") : undefined,
            imageUrl: moment.imageUrl ?? undefined,
            order: moment.order,
          }}
        />
      </div>
    </div>
  );
}
