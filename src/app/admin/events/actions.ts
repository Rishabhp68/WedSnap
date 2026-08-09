"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { upsertEventSchema } from "@/lib/validation/event";
import type { AdminFormState } from "@/lib/actions/types";

function revalidateEventPaths() {
  revalidatePath("/");
  revalidatePath("/app/wedding");
  revalidatePath("/admin/events");
}

export async function saveEventAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  const { wedding } = await requireAdmin();

  const parsed = upsertEventSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime") || undefined,
    venueName: formData.get("venueName"),
    venueAddress: formData.get("venueAddress"),
    dressCode: formData.get("dressCode") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    mapUrl: formData.get("mapUrl") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const tz = wedding.timezone;
  const data = {
    weddingId: wedding.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    date: fromZonedTime(parsed.data.date, tz),
    startTime: fromZonedTime(parsed.data.startTime, tz),
    endTime: parsed.data.endTime ? fromZonedTime(parsed.data.endTime, tz) : null,
    venueName: parsed.data.venueName,
    venueAddress: parsed.data.venueAddress,
    dressCode: parsed.data.dressCode || null,
    imageUrl: parsed.data.imageUrl || null,
    mapUrl: parsed.data.mapUrl || null,
    order: parsed.data.order,
  };

  if (parsed.data.id) {
    // `id` is a client-supplied hidden field — scope the update to this
    // admin's own wedding rather than trusting it points at one of ours.
    const { count } = await prisma.event.updateMany({
      where: { id: parsed.data.id, weddingId: wedding.id },
      data,
    });
    if (count === 0) {
      return { ok: false, error: "That event could not be found." };
    }
  } else {
    await prisma.event.create({ data });
  }

  revalidateEventPaths();
  redirect("/admin/events");
}

export async function deleteEventAction(eventId: string): Promise<void> {
  const { wedding } = await requireAdmin();
  await prisma.event.deleteMany({ where: { id: eventId, weddingId: wedding.id } });
  revalidateEventPaths();
}
