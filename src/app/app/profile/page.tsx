import { CalendarDays, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { requireGuest } from "@/lib/auth/current-guest";
import { getGuestProfileStats } from "@/lib/data/profile";
import { EditProfileDialog } from "@/components/social/edit-profile-dialog";
import { formatEventDate } from "@/lib/utils/dates";

const RSVP_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  ATTENDING: { label: "Attending", variant: "default" },
  MAYBE: { label: "Maybe", variant: "secondary" },
  NOT_ATTENDING: { label: "Not attending", variant: "outline" },
  PENDING: { label: "RSVP pending", variant: "outline" },
};

export default async function ProfilePage() {
  const { user, guest, wedding } = await requireGuest();
  const { postCount, rsvp } = await getGuestProfileStats(wedding.id, user.id);
  const rsvpInfo = RSVP_LABELS[rsvp?.status ?? "PENDING"];

  return (
    <div className="mx-auto max-w-xl px-4 pt-safe pb-6">
      <div className="flex flex-col items-center gap-4 pt-8 text-center">
        <Avatar className="size-24">
          <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="text-2xl">{user.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-display text-2xl">{user.name}</h1>
          {user.bio ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{user.bio}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={rsvpInfo.variant}>{rsvpInfo.label}</Badge>
          {guest.role === "ADMIN" ? <Badge variant="secondary">Admin</Badge> : null}
        </div>

        <EditProfileDialog name={user.name} bio={user.bio} avatarUrl={user.avatarUrl} />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-5">
          <Camera className="size-5 text-accent-foreground/70" />
          <span className="text-xl font-semibold tabular-nums">{postCount}</span>
          <span className="text-xs text-muted-foreground">Moments shared</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-5">
          <CalendarDays className="size-5 text-accent-foreground/70" />
          <span className="text-sm font-medium">{formatEventDate(guest.joinedAt, wedding.timezone)}</span>
          <span className="text-xs text-muted-foreground">Joined</span>
        </div>
      </div>
    </div>
  );
}
