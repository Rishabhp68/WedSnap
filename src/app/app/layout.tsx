import { requireGuest } from "@/lib/auth/current-guest";
import { AppShell } from "@/components/layout/app-shell";
import { getUnreadActivityCount } from "@/lib/data/notifications";

export default async function GuestAppLayout({ children }: { children: React.ReactNode }) {
  const { user, guest, wedding } = await requireGuest();
  const unreadCount = await getUnreadActivityCount(wedding.id, user.id, guest.notificationsSeenAt);

  return (
    <AppShell
      weddingLabel={`${wedding.partnerOneName[0]}&${wedding.partnerTwoName[0]}`}
      guestName={user.name}
      guestAvatarUrl={user.avatarUrl}
      weddingId={wedding.id}
      currentUserId={user.id}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
