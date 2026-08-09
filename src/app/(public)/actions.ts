"use server";

import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { submitRsvpSchema } from "@/lib/validation/rsvp";

export interface RsvpActionState {
  ok: boolean;
  error?: string;
}

export async function submitRsvpAction(
  _prevState: RsvpActionState | null,
  formData: FormData,
): Promise<RsvpActionState> {
  // requireGuest() redirects to /sign-in if the caller isn't authenticated —
  // the client only shows this form to signed-in guests, but the server
  // never trusts that on its own.
  const { user, wedding } = await requireGuest();

  const parsed = submitRsvpSchema.safeParse({
    status: formData.get("status"),
    guestCount: formData.get("guestCount"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your response." };
  }

  await prisma.rSVP.upsert({
    where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
    update: parsed.data,
    create: { weddingId: wedding.id, userId: user.id, ...parsed.data },
  });

  return { ok: true };
}
