import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteTimelineMomentAction } from "./actions";

export default async function AdminTimelinePage() {
  const { wedding } = await requireAdmin();
  const moments = await prisma.timelineMoment.findMany({
    where: { weddingId: wedding.id },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Our Story</h2>
        <Button asChild size="sm" className="rounded-full">
          <Link href="/admin/timeline/new">
            <Plus /> Add moment
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {moments.map((moment) => (
          <div
            key={moment.id}
            className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
          >
            <div className="min-w-0">
              <p className="font-medium">{moment.title}</p>
              <p className="truncate text-sm text-muted-foreground">{moment.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/admin/timeline/${moment.id}/edit`}>Edit</Link>
              </Button>
              <DeleteButton
                action={deleteTimelineMomentAction.bind(null, moment.id)}
                confirmMessage={`Delete "${moment.title}"? This can't be undone.`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
