"use server";

import { revalidatePath } from "next/cache";
import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";

/** Moves this guest's "seen" watermark to now, clearing the activity badge. */
export async function markActivitySeenAction() {
  const { user, wedding } = await requireGuest();

  await prisma.weddingGuest.update({
    where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
    data: { notificationsSeenAt: new Date() },
  });

  // The bell renders in the /app layout, so the page-level revalidation isn't
  // enough on its own — the badge would keep showing a stale count.
  revalidatePath("/app", "layout");

  return { ok: true as const };
}
