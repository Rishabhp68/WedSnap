"use server";

import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { sendMessageSchema } from "@/lib/validation/message";
import { pusherServer } from "@/lib/realtime/pusher-server";
import { chatRoomChannel, CHAT_EVENTS, userChannel, USER_EVENTS } from "@/lib/realtime/channels";
import { sendPushToUsers } from "@/lib/push/server";

export async function sendMessageAction(chatRoomId: string, content: string, clientId: string) {
  const { user } = await requireGuest();

  const parsed = sendMessageSchema.safeParse({ chatRoomId, content, clientId });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Message couldn't be sent." };
  }

  const membership = await prisma.chatMember.findUnique({
    where: { chatRoomId_userId: { chatRoomId: parsed.data.chatRoomId, userId: user.id } },
    // The room comes along for the notification title: a sender's name alone
    // is ambiguous in a group, where "who" and "where" are different answers.
    include: { chatRoom: { select: { type: true, name: true } } },
  });
  if (!membership) {
    return { ok: false as const, error: "You're not part of this chat." };
  }

  // The id is client-generated (not the DB default) specifically so the
  // sender's optimistic bubble, the Pusher echo, and this return value all
  // carry the same id — the UI can then dedupe correctly no matter which
  // of the three arrives first.
  const message = await prisma.message.create({
    data: {
      id: parsed.data.clientId,
      chatRoomId: parsed.data.chatRoomId,
      userId: user.id,
      content: parsed.data.content,
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Fan-out to everyone currently connected to the room — this is the one
  // place a naive polling architecture would fall over with 400-500 guests;
  // Pusher's pub/sub keeps each client's connection idle until a message
  // actually arrives.
  await pusherServer.trigger(chatRoomChannel(parsed.data.chatRoomId), CHAT_EVENTS.NEW_MESSAGE, message);

  // Only this room's members — a DM must never ring the whole guest list.
  try {
    const recipients = await prisma.chatMember.findMany({
      where: { chatRoomId: parsed.data.chatRoomId, userId: { not: user.id } },
      select: { userId: true },
    });

    // Personal channel as well as the room channel: a recipient who has the
    // app open on some other screen isn't subscribed to this room, and their
    // Web Push notification is suppressed while the app is focused.
    await Promise.all(
      recipients.map((member) =>
        pusherServer.trigger(userChannel(member.userId), USER_EVENTS.DIRECT_ALERT, {
          roomId: parsed.data.chatRoomId,
          fromName: user.name,
        }),
      ),
    );

    // Mirrors how the chat list titles a room, so the notification and the
    // screen it opens agree on what the conversation is called.
    const room = membership.chatRoom;
    const title =
      room.type === "GROUP"
        ? `${user.name} · ${room.name ?? "Wedding Guests"}`
        : user.name;

    await sendPushToUsers(
      recipients.map((member) => member.userId),
      {
        title,
        body: parsed.data.content.slice(0, 140),
        url: `/app/chat/${parsed.data.chatRoomId}`,
        // Per-room tag so a busy group chat collapses into one notification
        // while a separate DM still arrives as its own.
        tag: `chat-${parsed.data.chatRoomId}`,
      },
    );
  } catch {
    // The message is already saved and broadcast; delivery is best-effort.
  }

  return { ok: true as const, message };
}

/**
 * Finds (or creates) the 1:1 DIRECT room between the current guest and
 * another guest of the same wedding, so "message any guest" never ends up
 * with duplicate DM threads between the same two people.
 */
export async function startDirectMessageAction(otherUserId: string) {
  const { user, wedding } = await requireGuest();

  if (otherUserId === user.id) {
    return { ok: false as const, error: "You can't message yourself." };
  }

  const otherGuest = await prisma.weddingGuest.findUnique({
    where: { weddingId_userId: { weddingId: wedding.id, userId: otherUserId } },
  });
  if (!otherGuest) {
    return { ok: false as const, error: "That guest couldn't be found." };
  }

  const existing = await prisma.chatRoom.findFirst({
    where: {
      weddingId: wedding.id,
      type: "DIRECT",
      AND: [{ members: { some: { userId: user.id } } }, { members: { some: { userId: otherUserId } } }],
    },
    select: { id: true },
  });
  if (existing) return { ok: true as const, roomId: existing.id };

  const room = await prisma.$transaction(async (tx) => {
    const created = await tx.chatRoom.create({ data: { weddingId: wedding.id, type: "DIRECT" } });
    await tx.chatMember.createMany({
      data: [
        { chatRoomId: created.id, userId: user.id },
        { chatRoomId: created.id, userId: otherUserId },
      ],
    });
    return created;
  });

  return { ok: true as const, roomId: room.id };
}
