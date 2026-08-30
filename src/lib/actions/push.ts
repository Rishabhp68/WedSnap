"use server";

import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";

interface SubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Stores (or refreshes) this browser's push endpoint for the signed-in guest.
 *
 * Upsert on `endpoint` rather than insert: browsers hand back the same
 * endpoint when a page re-subscribes, so a plain create would either collide
 * on the unique index or, without one, accumulate a duplicate row on every
 * app open and send the same guest N copies of every notification.
 */
export async function savePushSubscriptionAction(subscription: SubscriptionInput) {
  const { user } = await requireGuest();

  if (!subscription.endpoint || !subscription.p256dh || !subscription.auth) {
    return { ok: false as const, error: "Incomplete subscription." };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    // Reassign on conflict: a shared or handed-down device should notify
    // whoever is signed in now, not the previous owner.
    update: { userId: user.id, p256dh: subscription.p256dh, auth: subscription.auth },
    create: {
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  });

  return { ok: true as const };
}

/** Called when a guest turns notifications off, or on sign-out. */
export async function deletePushSubscriptionAction(endpoint: string) {
  const { user } = await requireGuest();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { ok: true as const };
}
