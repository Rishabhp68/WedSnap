"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SquarePen } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchField } from "@/components/shared/search-field";
import { startDirectMessageAction } from "@/lib/actions/chat";

interface Guest {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export function NewMessagePicker({ guests }: { guests: Guest[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [guests, query]);

  function handlePick(guestId: string) {
    startTransition(async () => {
      const result = await startDirectMessageAction(guestId);
      if (result.ok) {
        setOpen(false);
        router.push(`/app/chat/${result.roomId}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground"
        aria-label="New message"
      >
        <SquarePen className="size-5" />
      </button>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New message</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-2">
          <SearchField
            value={query}
            onValueChange={setQuery}
            placeholder="Search guests..."
            aria-label="Search guests"
          />
        </div>

        <div className="max-h-[60vh] flex-1 overflow-y-auto px-4 pb-safe">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No guests found.</p>
          ) : (
            filtered.map((guest) => (
              <button
                key={guest.id}
                type="button"
                disabled={isPending}
                onClick={() => handlePick(guest.id)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted disabled:opacity-50"
              >
                <Avatar className="size-10">
                  <AvatarImage src={guest.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{guest.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{guest.name}</span>
              </button>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
