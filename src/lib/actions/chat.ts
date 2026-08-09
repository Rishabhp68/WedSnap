"use server";

import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { sendMessageSchema } from "@/lib/validation/message";
import { pusherServer } from "@/lib/realtime/pusher-server";
import { chatRoomChannel, CHAT_EVENTS } from "@/lib/realtime/channels";

export async function sendMessageAction(chatRoomId: string, content: string) {
  const { user } = await requireGuest();

  const parsed = sendMessageSchema.safeParse({ chatRoomId, content });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Message couldn't be sent." };
  }

  const membership = await prisma.chatMember.findUnique({
    where: { chatRoomId_userId: { chatRoomId: parsed.data.chatRoomId, userId: user.id } },
  });
  if (!membership) {
    return { ok: false as const, error: "You're not part of this chat." };
  }

  const message = await prisma.message.create({
    data: { chatRoomId: parsed.data.chatRoomId, userId: user.id, content: parsed.data.content },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Fan-out to everyone currently connected to the room — this is the one
  // place a naive polling architecture would fall over with 400-500 guests;
  // Pusher's pub/sub keeps each client's connection idle until a message
  // actually arrives.
  await pusherServer.trigger(chatRoomChannel(parsed.data.chatRoomId), CHAT_EVENTS.NEW_MESSAGE, message);

  return { ok: true as const, message };
}
