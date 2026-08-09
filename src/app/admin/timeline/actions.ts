"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { upsertTimelineMomentSchema } from "@/lib/validation/timeline";
import type { AdminFormState } from "@/lib/actions/types";

function revalidateTimelinePaths() {
  revalidatePath("/");
  revalidatePath("/admin/timeline");
}

export async function saveTimelineMomentAction(
  _prevState: AdminFormState | null,
  formData: FormData,
): Promise<AdminFormState> {
  const { wedding } = await requireAdmin();

  const parsed = upsertTimelineMomentSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    description: formData.get("description"),
    date: formData.get("date") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const data = {
    weddingId: wedding.id,
    title: parsed.data.title,
    description: parsed.data.description,
    date: parsed.data.date ?? null,
    imageUrl: parsed.data.imageUrl || null,
    order: parsed.data.order,
  };

  if (parsed.data.id) {
    // `id` is a client-supplied hidden field — scope to this admin's wedding.
    const { count } = await prisma.timelineMoment.updateMany({
      where: { id: parsed.data.id, weddingId: wedding.id },
      data,
    });
    if (count === 0) {
      return { ok: false, error: "That moment could not be found." };
    }
  } else {
    await prisma.timelineMoment.create({ data });
  }

  revalidateTimelinePaths();
  redirect("/admin/timeline");
}

export async function deleteTimelineMomentAction(id: string): Promise<void> {
  const { wedding } = await requireAdmin();
  await prisma.timelineMoment.deleteMany({ where: { id, weddingId: wedding.id } });
  revalidateTimelinePaths();
}
