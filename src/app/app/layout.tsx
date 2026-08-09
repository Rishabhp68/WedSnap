import { requireGuest } from "@/lib/auth/current-guest";
import { AppShell } from "@/components/layout/app-shell";

export default async function GuestAppLayout({ children }: { children: React.ReactNode }) {
  const { user, wedding } = await requireGuest();

  return (
    <AppShell
      weddingLabel={`${wedding.partnerOneName[0]}&${wedding.partnerTwoName[0]}`}
      guestName={user.name}
      guestAvatarUrl={user.avatarUrl}
    >
      {children}
    </AppShell>
  );
}
