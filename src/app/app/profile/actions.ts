"use server";

import { revalidatePath } from "next/cache";
import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { updateProfileSchema } from "@/lib/validation/profile";

export interface UpdateProfileState {
  ok: boolean;
  error?: string;
}

export async function updateProfileAction(
  _prevState: UpdateProfileState | null,
  formData: FormData,
): Promise<UpdateProfileState> {
  const { user } = await requireGuest();

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio || null,
      ...(parsed.data.avatarUrl ? { avatarUrl: parsed.data.avatarUrl } : {}),
    },
  });

  revalidatePath("/app/profile");
  revalidatePath("/app");
  return { ok: true };
}
