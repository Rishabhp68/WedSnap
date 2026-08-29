"use server";

import { revalidatePath } from "next/cache";
import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { updateLocationSchema } from "@/lib/validation/location";
import { pusherServer } from "@/lib/realtime/pusher-server";
import { locationChannel, LOCATION_EVENTS } from "@/lib/realtime/channels";
import type { SharedLocation } from "@/lib/data/location";

/** Turns live-map sharing on/off for the signed-in guest, scoped to this wedding. */
export async function setLocationSharingAction(enabled: boolean) {
  const { user, wedding } = await requireGuest();

  await prisma.weddingGuest.update({
    where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
    data: enabled
      ? { locationSharingEnabled: true }
      : { locationSharingEnabled: false, latitude: null, longitude: null, locationUpdatedAt: null },
  });

  if (!enabled) {
    await pusherServer.trigger(locationChannel(wedding.id), LOCATION_EVENTS.SHARING_STOPPED, {
      userId: user.id,
    });
  }

  // Without this the map keeps rendering the cached `sharingEnabled` from
  // before the toggle, so the guest turns sharing on and still isn't tracked.
  revalidatePath("/app/map");
  revalidatePath("/app/profile");

  return { ok: true as const, enabled };
}

/** Pushes a fresh device position for the signed-in guest and broadcasts it to the wedding's map. */
export async function updateLocationAction(latitude: number, longitude: number) {
  const { user, guest, wedding } = await requireGuest();
  if (!guest.locationSharingEnabled) return { ok: false as const };

  const parsed = updateLocationSchema.safeParse({ latitude, longitude });
  if (!parsed.success) return { ok: false as const };

  const updated = await prisma.weddingGuest.update({
    where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
    data: {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      locationUpdatedAt: new Date(),
    },
  });

  const payload: SharedLocation = {
    userId: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    updatedAt: updated.locationUpdatedAt!.toISOString(),
  };
  await pusherServer.trigger(locationChannel(wedding.id), LOCATION_EVENTS.LOCATION_UPDATED, payload);

  return { ok: true as const };
}
