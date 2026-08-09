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
