import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleToggle } from "@/components/admin/role-toggle";
import { formatEventDate } from "@/lib/utils/dates";

const RSVP_LABELS: Record<string, string> = {
  ATTENDING: "Attending",
  MAYBE: "Maybe",
  NOT_ATTENDING: "Not attending",
};

export default async function AdminGuestsPage() {
  const { wedding } = await requireAdmin();
  const guests = await prisma.weddingGuest.findMany({
    where: { weddingId: wedding.id },
    orderBy: { joinedAt: "asc" },
    include: {
      user: {
        include: {
          rsvps: { where: { weddingId: wedding.id }, select: { status: true } },
          _count: { select: { posts: { where: { weddingId: wedding.id, isDeleted: false } } } },
        },
      },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Guests</h2>
        <p className="text-sm text-muted-foreground">{guests.length} total</p>
      </div>

      <div className="mt-6 space-y-2">
        {guests.map((guest) => {
          const rsvpStatus = guest.user.rsvps[0]?.status;
          return (
            <div
              key={guest.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={guest.user.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{guest.user.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{guest.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatEventDate(guest.joinedAt, wedding.timezone)} &middot;{" "}
                    {guest.user._count.posts} {guest.user._count.posts === 1 ? "photo" : "photos"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {rsvpStatus ? (
                  <Badge variant={rsvpStatus === "ATTENDING" ? "default" : "secondary"}>
                    {RSVP_LABELS[rsvpStatus]}
                  </Badge>
                ) : (
                  <Badge variant="outline">No RSVP</Badge>
                )}
                <RoleToggle guestId={guest.id} role={guest.role} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
