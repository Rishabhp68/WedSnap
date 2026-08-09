import { z } from "zod";

export const REACTION_TYPES = ["LIKE", "LOVE", "HAHA", "WOW", "CELEBRATE"] as const;

export const toggleReactionSchema = z.object({
  postId: z.string().min(1),
  type: z.enum(REACTION_TYPES),
});

export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;
