import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatEventDate } from "@/lib/utils/dates";

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  ATTENDING: { label: "Attending", variant: "default" },
  MAYBE: { label: "Maybe", variant: "secondary" },
  NOT_ATTENDING: { label: "Not attending", variant: "outline" },
};

export default async function AdminRsvpsPage() {
  const { wedding } = await requireAdmin();
  const rsvps = await prisma.rSVP.findMany({
    where: { weddingId: wedding.id },
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { name: true, avatarUrl: true } } },
  });

  const totalGuestsAttending = rsvps
    .filter((r) => r.status === "ATTENDING")
    .reduce((sum, r) => sum + r.guestCount, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">RSVPs</h2>
        <p className="text-sm text-muted-foreground">{totalGuestsAttending} total attending (incl. plus-ones)</p>
      </div>

      <div className="mt-6 space-y-2">
        {rsvps.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          rsvps.map((rsvp) => {
            const meta = STATUS_META[rsvp.status] ?? { label: rsvp.status, variant: "outline" as const };
            return (
              <div
                key={rsvp.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarImage src={rsvp.user.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback>{rsvp.user.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{rsvp.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated {formatEventDate(rsvp.updatedAt, wedding.timezone)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {rsvp.message ? (
                    <p className="max-w-xs truncate text-sm text-muted-foreground italic">&ldquo;{rsvp.message}&rdquo;</p>
                  ) : null}
                  {rsvp.status === "ATTENDING" ? (
                    <span className="text-sm text-muted-foreground">{rsvp.guestCount} guest(s)</span>
                  ) : null}
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
