"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchField } from "@/components/shared/search-field";
import { startDirectMessageAction } from "@/lib/actions/chat";

export interface ConversationItem {
  id: string;
  title: string;
  avatarUrl: string | null;
  otherUserId: string | null;
  isGroup: boolean;
  preview: string;
  timeLabel: string | null;
}

export interface GuestItem {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  guests: GuestItem[];
}

function GroupBadge() {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/40 text-primary">
      <Users className="size-5" />
    </span>
  );
}

export function ConversationList({ conversations, guests }: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [pendingGuestId, setPendingGuestId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const trimmed = query.trim().toLowerCase();

  const matchingConversations = useMemo(() => {
    if (!trimmed) return conversations;
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(trimmed) || c.preview.toLowerCase().includes(trimmed),
    );
  }, [conversations, trimmed]);

  // Guests are only offered once the guest is actually searching, and only
  // those without an existing thread — otherwise the same person would show
  // up twice, once per section.
  const matchingGuests = useMemo(() => {
    if (!trimmed) return [];
    const alreadyMessaged = new Set(conversations.map((c) => c.otherUserId).filter(Boolean));
    return guests.filter((g) => !alreadyMessaged.has(g.id) && g.name.toLowerCase().includes(trimmed));
  }, [guests, conversations, trimmed]);

  function handleStartChat(guestId: string) {
    setPendingGuestId(guestId);
    startTransition(async () => {
      const result = await startDirectMessageAction(guestId);
      if (result.ok) {
        router.push(`/app/chat/${result.roomId}`);
      } else {
        toast.error(result.error);
        setPendingGuestId(null);
      }
    });
  }

  const nothingFound = matchingConversations.length === 0 && matchingGuests.length === 0;

  return (
    <div className="mt-4">
      <SearchField
        value={query}
        onValueChange={setQuery}
        placeholder="Search guests and messages"
        aria-label="Search guests and messages"
        className="border-transparent"
      />

      {nothingFound ? (
        <div className="mt-6">
          {trimmed ? (
            <EmptyState icon={Search} title="No matches" description={`Nothing found for "${query.trim()}".`} />
          ) : (
            <EmptyState icon={MessageCircle} title="The celebration starts here." />
          )}
        </div>
      ) : null}

      {matchingConversations.length > 0 ? (
        <div className="mt-3 space-y-0.5">
          {matchingConversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/app/chat/${conversation.id}`}
              className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-muted active:bg-muted"
            >
              {conversation.isGroup ? (
                <GroupBadge />
              ) : (
                <Avatar className="size-12 shrink-0">
                  <AvatarImage src={conversation.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{conversation.title.slice(0, 1)}</AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium">{conversation.title}</p>
                  {conversation.timeLabel ? (
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {conversation.timeLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{conversation.preview}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {matchingGuests.length > 0 ? (
        <div className="mt-6">
          <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Start a new chat
          </p>
          <div className="mt-2 space-y-0.5">
            {matchingGuests.map((guest) => (
              <button
                key={guest.id}
                type="button"
                disabled={isPending}
                onClick={() => handleStartChat(guest.id)}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-60"
              >
                <Avatar className="size-12 shrink-0">
                  <AvatarImage src={guest.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{guest.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{guest.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Tap to start a conversation</p>
                </div>
                {pendingGuestId === guest.id ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
