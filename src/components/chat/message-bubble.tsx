import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/data/chat";

export function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}>
      {!isOwn ? (
        <Avatar className="size-7 shrink-0">
          <AvatarImage src={message.user.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="text-xs">{message.user.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
      ) : null}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2",
          isOwn ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
        )}
      >
        {!isOwn ? (
          <p className="mb-0.5 text-xs font-medium text-accent-foreground/80">{message.user.name}</p>
        ) : null}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}
