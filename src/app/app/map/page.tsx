import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { getSharedLocations } from "@/lib/data/location";
import { getOtherGuests } from "@/lib/data/chat";
import { MapPageClient } from "@/components/map/map-page-client";

// Falls back to the wedding's own venue/default timezone region when nobody
// has shared a location yet, so the map never opens on the null-island (0,0) default.
const FALLBACK_CENTER = { lat: 28.6139, lng: 77.209 };

export default async function MapPage() {
  const { user, guest, wedding } = await requireGuest();

  const [locations, venue, guests] = await Promise.all([
    getSharedLocations(wedding.id),
    prisma.venue.findUnique({ where: { weddingId: wedding.id }, select: { latitude: true, longitude: true } }),
    getOtherGuests(wedding.id, user.id),
  ]);

  const self = locations.find((location) => location.userId === user.id);
  const center = self
    ? { lat: self.latitude, lng: self.longitude }
    : venue?.latitude != null && venue.longitude != null
      ? { lat: venue.latitude, lng: venue.longitude }
      : locations[0]
        ? { lat: locations[0].latitude, lng: locations[0].longitude }
        : FALLBACK_CENTER;

  return (
    <div className="flex h-[calc(100dvh-4rem-5rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <h1 className="font-display text-xl">Wedding Map</h1>
        <p className="text-xs text-muted-foreground">See guests who are sharing their location right now.</p>
      </header>
      <div className="min-h-0 flex-1">
        <MapPageClient
          weddingId={wedding.id}
          currentUserId={user.id}
          currentUserName={user.name}
          currentUserAvatarUrl={user.avatarUrl}
          guests={guests}
          initialLocations={locations}
          sharingEnabled={guest.locationSharingEnabled}
          center={center}
        />
      </div>
    </div>
  );
}
