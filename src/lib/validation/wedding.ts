import { z } from "zod";

export const updateWeddingDetailsSchema = z.object({
  partnerOneName: z.string().trim().min(1).max(80),
  partnerTwoName: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  // A <input type="datetime-local"> value ("2026-12-11T18:00") has no
  // timezone of its own — the action combines this with `timezone` (via
  // fromZonedTime) rather than letting zod/JS assume the server's local
  // timezone, which would silently produce the wrong UTC instant.
  weddingDate: z.string().min(1),
  timezone: z.string().min(1),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  saveTheDateVideoUrl: z.string().url().optional().or(z.literal("")),
});

export const updateVenueSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(400),
  mapUrl: z.string().url().optional().or(z.literal("")),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  parkingInfo: z.string().trim().max(500).optional().or(z.literal("")),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
});

export type UpdateWeddingDetailsInput = z.infer<typeof updateWeddingDetailsSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
