import { NewMessagePicker } from "@/components/chat/new-message-picker";
import { ConversationList, type ConversationItem } from "@/components/chat/conversation-list";
import { requireGuest } from "@/lib/auth/current-guest";
import { getConversations, getOtherGuests } from "@/lib/data/chat";
import { formatCompactTimestamp } from "@/lib/utils/dates";

export default async function ChatListPage() {
  const { user, wedding } = await requireGuest();
  const [conversations, guests] = await Promise.all([
    getConversations(wedding.id, user.id),
    getOtherGuests(wedding.id, user.id),
  ]);

  // Flattened here rather than in the client component so Dates never cross
  // the boundary and relative timestamps are rendered once, on the server.
  const items: ConversationItem[] = conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    avatarUrl: conversation.avatarUrl,
    otherUserId: conversation.otherUserId,
    isGroup: conversation.type === "GROUP",
    preview: conversation.lastMessage
      ? `${conversation.lastMessage.userId === user.id ? "You: " : ""}${conversation.lastMessage.content}`
      : "No messages yet",
    timeLabel: conversation.lastMessage ? formatCompactTimestamp(conversation.activityAt) : null,
  }));

  return (
    <div className="mx-auto max-w-xl px-4 pt-safe pb-6">
      <div className="flex items-center justify-between pt-4">
        <h1 className="font-display text-2xl">Chat</h1>
        <NewMessagePicker guests={guests} />
      </div>

      <ConversationList conversations={items} guests={guests} />
    </div>
  );
}
