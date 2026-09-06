"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { MessageBubble } from "./message-bubble";
import { getPusherClient } from "@/lib/realtime/pusher-client";
import { chatRoomChannel, CHAT_EVENTS } from "@/lib/realtime/channels";
import { sendMessageAction } from "@/lib/actions/chat";
import type { ChatMessage } from "@/lib/data/chat";

interface ChatRoomProps {
  chatRoomId: string;
  currentUserId: string;
  initialMessages: ChatMessage[]; // chronological, oldest first
  initialCursor: string | null; // cursor for loading OLDER messages
}

export function ChatRoom({ chatRoomId, currentUserId, initialMessages, initialCursor }: ChatRoomProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef<number | null>(null);
  const scrolledInitially = useRef(false);

  useEffect(() => {
    if (!scrolledInitially.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      scrolledInitially.current = true;
    }
  }, []);

  // Prepending older history shifts scroll position — compensate so the
  // viewport stays anchored on whatever the guest was already reading.
  useLayoutEffect(() => {
    if (prevScrollHeight.current !== null && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = null;
    }
  }, [messages]);

  async function loadOlder() {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/chat/${chatRoomId}/messages?cursor=${cursor}`);
      if (!res.ok) throw new Error("Request failed");
      const data: { messages: ChatMessage[]; nextCursor: string | null } = await res.json();
      if (scrollRef.current) prevScrollHeight.current = scrollRef.current.scrollHeight;
      setMessages((prev) => [...data.messages.slice().reverse(), ...prev]);
      setCursor(data.nextCursor);
    } catch {
      toast.error("Couldn't load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }

  const { ref: topSentinelRef } = useInView({
    onChange: (inView) => {
      if (inView) loadOlder();
    },
  });

  // Realtime fan-out — every guest connected to this room gets new messages
  // pushed over one shared WebSocket connection, so 400+ guests never means
  // 400+ clients polling the database.
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(chatRoomChannel(chatRoomId));

    function handleNewMessage(message: ChatMessage) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        const el = scrollRef.current;
        const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 150 : true;
        const next = [...prev, message];
        if (nearBottom) {
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
          });
        }
        return next;
      });
    }

    channel.bind(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
    return () => {
      channel.unbind(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
      pusher.unsubscribe(chatRoomChannel(chatRoomId));
    };
  }, [chatRoomId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setText("");
    setSending(true);

    // The id is generated here (not by the DB) and sent to the server as
    // the message's real primary key. That's what makes this safe: the
    // optimistic bubble, the Pusher echo, and the action's return value all
    // carry the *same* id, so whichever arrives first "wins" and the
    // others are recognized as the same message instead of duplicating it.
    // MessageBubble never renders the sender's own name/avatar, so the
    // placeholder user fields below are never actually shown.
    const clientId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: clientId,
        chatRoomId,
        userId: currentUserId,
        content,
        isDeleted: false,
        createdAt: new Date(),
        user: { id: currentUserId, name: "", avatarUrl: null },
      },
    ]);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });

    const result = await sendMessageAction(chatRoomId, content, clientId);
    setSending(false);
    if (!result.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
      toast.error(result.error ?? "Message couldn't be sent.");
    }
    // On success we deliberately don't touch `messages` here — the Pusher
    // echo (or the dedupe check within it) is what reconciles this id, so
    // there's exactly one write path instead of two racing ones.
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {cursor ? <div ref={topSentinelRef} className="h-1" /> : null}
        {messages.length === 0 ? (
          <EmptyState icon={MessageCircle} title="The celebration starts here." />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} isOwn={message.userId === currentUserId} />
          ))
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border bg-background p-3 pb-safe"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the wedding..."
          maxLength={1000}
          className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary"
        />
        <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" disabled={!text.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
