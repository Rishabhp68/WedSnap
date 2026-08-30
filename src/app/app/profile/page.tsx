import Link from "next/link";
import { CalendarDays, Camera, LogOut, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireGuest } from "@/lib/auth/current-guest";
import { getGuestProfileStats } from "@/lib/data/profile";
import { EditProfileDialog } from "@/components/social/edit-profile-dialog";
import { LocationSharingToggle } from "@/components/social/location-sharing-toggle";
import { NotificationToggle } from "@/components/social/notification-toggle";
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

      <div className="mt-6 space-y-3">
        <NotificationToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        <LocationSharingToggle initialEnabled={guest.locationSharingEnabled} />
      </div>

      {/* The only route into /admin from the app — the admin area links back
          here, but nothing linked in, so the section was unreachable without
          typing the URL. */}
      {guest.role === "ADMIN" ? (
        <Link
          href="/admin"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Admin dashboard</span>
            <span className="block text-xs text-muted-foreground">
              Manage events, guests, RSVPs and moderation.
            </span>
          </span>
        </Link>
      ) : null}

      {/* Signing out used to live in Clerk's UserButton menu in the top bar;
          that avatar now opens this page, so the action moves here. */}
      <div className="mt-6">
        <SignOutButton redirectUrl="/">
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl text-destructive hover:text-destructive"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}
