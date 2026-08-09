import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { StoryGroup } from "@/lib/data/stories";

export function StoryRail({ groups, currentUserId }: { groups: StoryGroup[]; currentUserId: string }) {
  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-4 no-scrollbar">
      <Link href="/app/camera" className="flex w-16 shrink-0 flex-col items-center gap-1.5">
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-border text-2xl text-muted-foreground">
          +
        </div>
        <span className="w-full truncate text-center text-xs text-muted-foreground">Your moment</span>
      </Link>

      {groups
        .filter((g) => g.user.id !== currentUserId)
        .map((group) => (
          <Link
            key={group.user.id}
            href={`/app/stories/${group.user.id}`}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <div className="rounded-full bg-gradient-to-tr from-primary via-accent to-primary p-[2px]">
              <Avatar className="size-16 border-2 border-background">
                <AvatarImage src={group.user.avatarUrl ?? undefined} alt="" />
                <AvatarFallback>{group.user.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
            </div>
            <span className="w-full truncate text-center text-xs text-foreground">
              {group.user.name.split(" ")[0]}
            </span>
          </Link>
        ))}
    </div>
  );
}
