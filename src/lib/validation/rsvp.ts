import { z } from "zod";

export const submitRsvpSchema = z.object({
  status: z.enum(["ATTENDING", "NOT_ATTENDING", "MAYBE"]),
  guestCount: z.coerce.number().int().min(1).max(10).default(1),
  message: z.string().trim().max(500).optional(),
});

export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;
