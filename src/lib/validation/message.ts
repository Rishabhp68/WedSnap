import { z } from "zod";

export const sendMessageSchema = z.object({
  chatRoomId: z.string().min(1),
  content: z.string().trim().min(1).max(1000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
