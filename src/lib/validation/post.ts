import { z } from "zod";

export const postMediaInputSchema = z.object({
  storageKey: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().min(1),
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

export const createPostSchema = z.object({
  caption: z.string().trim().max(500).optional(),
  // MVP UI only ever sends one item; the array shape means multi-photo/video
  // posts don't need a schema or validation change later.
  media: z.array(postMediaInputSchema).min(1).max(10),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
