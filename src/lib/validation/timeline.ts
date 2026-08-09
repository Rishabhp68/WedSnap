import { z } from "zod";

export const upsertTimelineMomentSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Give this moment a title.").max(120),
  description: z.string().trim().min(1).max(1000),
  date: z.coerce.date().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).default(0),
});

export type UpsertTimelineMomentInput = z.infer<typeof upsertTimelineMomentSchema>;
