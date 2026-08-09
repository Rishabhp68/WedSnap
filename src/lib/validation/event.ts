import { z } from "zod";

export const upsertEventSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Give this event a name.").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  // Plain <input type="date"|"datetime-local"> strings — the action
  // combines these with the wedding's timezone via fromZonedTime, since
  // they carry no timezone of their own.
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().optional().or(z.literal("")),
  venueName: z.string().trim().min(1).max(200),
  venueAddress: z.string().trim().min(1).max(400),
  dressCode: z.string().trim().max(200).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  mapUrl: z.string().url().optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).default(0),
});

export type UpsertEventInput = z.infer<typeof upsertEventSchema>;
