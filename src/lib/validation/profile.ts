import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty.").max(80),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  avatarUrl: z.string().url().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
