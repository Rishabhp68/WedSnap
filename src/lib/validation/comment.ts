import { z } from "zod";

export const createCommentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().trim().min(1, "Say something first.").max(500),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
