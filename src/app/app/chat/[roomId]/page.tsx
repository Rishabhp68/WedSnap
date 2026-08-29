import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatRoom } from "@/components/chat/chat-room";
import { requireGuest } from "@/lib/auth/current-guest";
import { getChatRoomForViewer, getMessagesPage } from "@/lib/data/chat";

export default async function ChatThreadPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const { user } = await requireGuest();

  const room = await getChatRoomForViewer(roomId, user.id);
  if (!room) notFound();

  const page = await getMessagesPage(room.id);

  return (
    <div className="flex h-[calc(100dvh-4rem-5rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3">
        <Link
          href="/app/chat"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-5" />
        </Link>
        {room.type === "GROUP" ? (
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-4" />
          </span>
        ) : (
          <Avatar className="size-9">
            <AvatarImage src={room.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{room.title.slice(0, 1)}</AvatarFallback>
          </Avatar>
        )}
        <p className="text-sm font-medium">{room.title}</p>
      </header>

      <div className="min-h-0 flex-1">
        <ChatRoom
          chatRoomId={room.id}
          currentUserId={user.id}
          initialMessages={page.messages.slice().reverse()}
          initialCursor={page.nextCursor}
        />
      </div>
    </div>
  );
}
