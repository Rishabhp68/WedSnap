import { prisma } from "@/lib/db/client";

export interface SharedLocation {
  userId: string;
  name: string;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

/** Every guest in this wedding currently sharing their location, for the map's initial render. */
export async function getSharedLocations(weddingId: string): Promise<SharedLocation[]> {
  const guests = await prisma.weddingGuest.findMany({
    where: {
      weddingId,
      locationSharingEnabled: true,
      latitude: { not: null },
      longitude: { not: null },
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return guests.map((g) => ({
    userId: g.user.id,
    name: g.user.name,
    avatarUrl: g.user.avatarUrl,
    latitude: g.latitude!,
    longitude: g.longitude!,
    updatedAt: (g.locationUpdatedAt ?? new Date()).toISOString(),
  }));
}
