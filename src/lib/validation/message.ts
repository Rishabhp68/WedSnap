import { z } from "zod";

export const sendMessageSchema = z.object({
  chatRoomId: z.string().min(1),
  content: z.string().trim().min(1).max(1000),
  // Client-generated id (crypto.randomUUID()), used as the Message's real
  // primary key. This is what lets the sender reconcile their own
  // optimistic bubble with the Pusher echo of the same message without
  // ever showing it twice, regardless of which arrives first.
  clientId: z.string().min(10).max(100),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
