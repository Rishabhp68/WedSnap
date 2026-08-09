"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";

const setGuestRoleSchema = z.object({
  guestId: z.string().min(1),
  role: z.enum(["ADMIN", "GUEST"]),
});

export async function setGuestRoleAction(guestId: string, role: string): Promise<void> {
  const { wedding } = await requireAdmin();

  const parsed = setGuestRoleSchema.safeParse({ guestId, role });
  if (!parsed.success) return;

  // updateMany + weddingId keeps this scoped to the admin's own wedding —
  // guestId reaches this action as a plain client-supplied argument (unlike
  // the .bind()-baked ids used elsewhere), so it can't be trusted to
  // already belong here.
  await prisma.weddingGuest.updateMany({
    where: { id: parsed.data.guestId, weddingId: wedding.id },
    data: { role: parsed.data.role },
  });

  revalidatePath("/admin/guests");
}
