import { requireGuest } from "@/lib/auth/current-guest";
import { getGroupChatRoom, getMessagesPage } from "@/lib/data/chat";
import { ChatRoom } from "@/components/chat/chat-room";

export default async function ChatPage() {
  const { user, wedding } = await requireGuest();
  const room = await getGroupChatRoom(wedding.id);
  const page = await getMessagesPage(room.id);

  return (
    <ChatRoom
      chatRoomId={room.id}
      currentUserId={user.id}
      initialMessages={page.messages.slice().reverse()}
      initialCursor={page.nextCursor}
    />
  );
}
