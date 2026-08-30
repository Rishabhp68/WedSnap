import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db/client";

export interface PushPayload {
  title: string;
  body: string;
  /** Where tapping the notification should land. Relative to the app origin. */
  url?: string;
  /**
   * Grouping key. Two pushes with the same tag collapse into one notification
   * on the device, so a burst of photos doesn't bury the tray.
   */
  tag?: string;
}

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@example.com";

/**
 * Push is optional infrastructure: without VAPID keys configured the app must
 * still run, just without notifications. Every caller therefore treats a
 * missing config as "nothing to send" rather than an error.
 */
export const pushConfigured = Boolean(publicKey && privateKey);

if (pushConfigured) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
}

/**
 * Sends one payload to every registered device of the given users.
 *
 * Failures are swallowed per subscription on purpose. A push endpoint that has
 * expired returns 404/410, which says the browser threw the subscription away
 * — that's routine, not an error, and it must not abort delivery to the other
 * few hundred guests. Those dead rows are deleted as they're found, which is
 * the only garbage collection this table gets.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!pushConfigured || userIds.length === 0) return { sent: 0, removed: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subscriptions.length === 0) return { sent: 0, removed: 0 };

  const body = JSON.stringify(payload);
  const expired: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(subscription.id);
      }
    }),
  );

  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } });
  }

  return { sent, removed: expired.length };
}

/** Every guest of a wedding except the person who caused the notification. */
export async function sendPushToWedding(
  weddingId: string,
  actorUserId: string,
  payload: PushPayload,
) {
  if (!pushConfigured) return { sent: 0, removed: 0 };

  const guests = await prisma.weddingGuest.findMany({
    where: { weddingId, userId: { not: actorUserId } },
    select: { userId: true },
  });

  return sendPushToUsers(
    guests.map((guest) => guest.userId),
    payload,
  );
}
