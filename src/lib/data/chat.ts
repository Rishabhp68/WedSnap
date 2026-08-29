import { prisma } from "@/lib/db/client";

/** Every guest is auto-enrolled in the wedding-wide GROUP room (see lib/auth/sync.ts), so there's exactly one per wedding. */
export async function getGroupChatRoom(weddingId: string) {
  return prisma.chatRoom.findFirstOrThrow({
    where: { weddingId, type: "GROUP" },
  });
}

const MESSAGE_PAGE_SIZE = 30;

const MESSAGE_INCLUDE = {
  user: { select: { id: true, name: true, avatarUrl: true } },
};

/**
 * Cursor-paginated, newest first (the caller reverses for chronological
 * display) — chat history for a wedding with hundreds of guests can run to
 * thousands of messages, so this never loads more than a page at a time.
 */
export async function getMessagesPage(chatRoomId: string, cursor?: string) {
  const messages = await prisma.message.findMany({
    where: { chatRoomId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: MESSAGE_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: MESSAGE_INCLUDE,
  });

  const hasMore = messages.length > MESSAGE_PAGE_SIZE;
  const page = hasMore ? messages.slice(0, MESSAGE_PAGE_SIZE) : messages;

  return {
    messages: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export type ChatMessage = Awaited<ReturnType<typeof getMessagesPage>>["messages"][number];

/** Confirms membership and returns display info (group vs. the other person, for DMs) for a room's header. */
export async function getChatRoomForViewer(chatRoomId: string, viewerId: string) {
  const room = await prisma.chatRoom.findFirst({
    where: { id: chatRoomId, members: { some: { userId: viewerId } } },
    include: {
      members: {
        where: { userId: { not: viewerId } },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });
  if (!room) return null;

  return {
    id: room.id,
    type: room.type,
    title: room.type === "GROUP" ? (room.name ?? "Wedding Guests") : (room.members[0]?.user.name ?? "Guest"),
    avatarUrl: room.type === "DIRECT" ? (room.members[0]?.user.avatarUrl ?? null) : null,
  };
}

/** Every conversation (the group room + any DMs) a guest is part of, newest activity first, for the chat list screen. */
export async function getConversations(weddingId: string, userId: string) {
  const rooms = await prisma.chatRoom.findMany({
    where: { weddingId, members: { some: { userId } } },
    include: {
      members: {
        where: { userId: { not: userId } },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { user: { select: { name: true } } },
      },
    },
  });

  return rooms
    .map((room) => ({
      id: room.id,
      type: room.type,
      title: room.type === "GROUP" ? (room.name ?? "Wedding Guests") : (room.members[0]?.user.name ?? "Guest"),
      avatarUrl: room.type === "DIRECT" ? (room.members[0]?.user.avatarUrl ?? null) : null,
      // Lets the chat list hide guests from "start a new chat" search results
      // when a DM thread with them already exists.
      otherUserId: room.type === "DIRECT" ? (room.members[0]?.user.id ?? null) : null,
      lastMessage: room.messages[0] ?? null,
      activityAt: room.messages[0]?.createdAt ?? room.createdAt,
    }))
    .sort((a, b) => b.activityAt.getTime() - a.activityAt.getTime());
}

export type Conversation = Awaited<ReturnType<typeof getConversations>>[number];

/** Every other guest of the wedding — backs the chat "new message" picker and search, and the live map's guest search. */
export async function getOtherGuests(weddingId: string, excludeUserId: string) {
  const guests = await prisma.weddingGuest.findMany({
    where: { weddingId, userId: { not: excludeUserId } },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return guests.map((g) => g.user).sort((a, b) => a.name.localeCompare(b.name));
}
