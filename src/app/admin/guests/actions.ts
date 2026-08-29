"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";

const setGuestRoleSchema = z.object({
  guestId: z.string().min(1),
  role: z.enum(["ADMIN", "GUEST"]),
});

export type SetGuestRoleResult = { ok: true } | { ok: false; error: string };

export async function setGuestRoleAction(guestId: string, role: string): Promise<SetGuestRoleResult> {
  const { wedding } = await requireAdmin();

  const parsed = setGuestRoleSchema.safeParse({ guestId, role });
  if (!parsed.success) return { ok: false, error: "That role isn't valid." };

  const target = await prisma.weddingGuest.findFirst({
    where: { id: parsed.data.guestId, weddingId: wedding.id },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, error: "That guest isn't part of this wedding." };

  // Demoting the only admin would leave nobody able to reach /admin at all,
  // recoverable only with direct database access. Refuse it — including when
  // an admin is demoting themselves, which is the easy way to do it by
  // accident.
  if (target.role === "ADMIN" && parsed.data.role === "GUEST") {
    const adminCount = await prisma.weddingGuest.count({
      where: { weddingId: wedding.id, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      return { ok: false, error: "Make someone else an admin first — a wedding needs at least one." };
    }
  }

  // updateMany + weddingId keeps this scoped to the admin's own wedding —
  // guestId reaches this action as a plain client-supplied argument (unlike
  // the .bind()-baked ids used elsewhere), so it can't be trusted to
  // already belong here.
  await prisma.weddingGuest.updateMany({
    where: { id: parsed.data.guestId, weddingId: wedding.id },
    data: { role: parsed.data.role },
  });

  revalidatePath("/admin/guests");
  // The guest app's profile shows an admin-only dashboard link off this role.
  revalidatePath("/app/profile");
  return { ok: true };
}
