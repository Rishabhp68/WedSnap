"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { updateWeddingDetailsSchema, updateVenueSchema } from "@/lib/validation/wedding";
import type { AdminFormState } from "@/lib/actions/types";

export async function updateWeddingDetailsAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  const { wedding } = await requireAdmin();

  const parsed = updateWeddingDetailsSchema.safeParse({
    partnerOneName: formData.get("partnerOneName"),
    partnerTwoName: formData.get("partnerTwoName"),
    tagline: formData.get("tagline") || undefined,
    weddingDate: formData.get("weddingDate"),
    timezone: formData.get("timezone"),
    heroImageUrl: formData.get("heroImageUrl") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    saveTheDateVideoUrl: formData.get("saveTheDateVideoUrl") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await prisma.wedding.update({
    where: { id: wedding.id },
    data: {
      partnerOneName: parsed.data.partnerOneName,
      partnerTwoName: parsed.data.partnerTwoName,
      tagline: parsed.data.tagline || null,
      weddingDate: fromZonedTime(parsed.data.weddingDate, parsed.data.timezone),
      timezone: parsed.data.timezone,
      // Always written, never conditionally skipped: an empty field now means
      // "remove this image" (the picker has a clear button), and skipping the
      // write left the previous image in place with no way to get rid of it.
      heroImageUrl: parsed.data.heroImageUrl || null,
      coverImageUrl: parsed.data.coverImageUrl || null,
      saveTheDateVideoUrl: parsed.data.saveTheDateVideoUrl || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updateVenueAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  const { wedding } = await requireAdmin();

  const parsed = updateVenueSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    mapUrl: formData.get("mapUrl") || undefined,
    parkingInfo: formData.get("parkingInfo") || undefined,
    instructions: formData.get("instructions") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const data = {
    name: parsed.data.name,
    address: parsed.data.address,
    mapUrl: parsed.data.mapUrl || null,
    parkingInfo: parsed.data.parkingInfo || null,
    instructions: parsed.data.instructions || null,
  };

  await prisma.venue.upsert({
    where: { weddingId: wedding.id },
    update: data,
    create: { weddingId: wedding.id, ...data },
  });

  revalidatePath("/");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
