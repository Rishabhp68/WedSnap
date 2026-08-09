import { requireAdmin } from "@/lib/auth/current-guest";
import { getAdminOverviewStats } from "@/lib/data/admin";

export default async function AdminOverviewPage() {
  const { wedding } = await requireAdmin();
  const stats = await getAdminOverviewStats(wedding.id);

  const cards = [
    { label: "Guests", value: stats.guestCount },
    { label: "Photos shared", value: stats.postCount },
    { label: "Comments", value: stats.commentCount },
    { label: "Attending", value: stats.rsvpByStatus.ATTENDING },
    { label: "Maybe", value: stats.rsvpByStatus.MAYBE },
    { label: "Not attending", value: stats.rsvpByStatus.NOT_ATTENDING },
    { label: "Awaiting RSVP", value: stats.rsvpByStatus.PENDING },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl">Overview</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
