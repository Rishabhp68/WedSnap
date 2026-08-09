"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { StoryGroup } from "@/lib/data/stories";

const STORY_DURATION_MS = 5000;
const TICK_MS = 50;
const HOLD_THRESHOLD_MS = 200;

export function StoryViewer({
  groups,
  initialGroupIndex,
}: {
  groups: StoryGroup[];
  initialGroupIndex: number;
}) {
  const router = useRouter();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);
  const pointerDownAt = useRef(0);
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  function close() {
    router.push("/app");
  }

  function goNext() {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      close();
    }
  }

  function goPrev() {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((i) => i - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  }

  // Reset progress whenever the active story changes. Intentional: this
  // synchronizes local UI state with a prop-driven index change, not a
  // value derivable at render time (elapsedRef is a mutable ref, not state).
  useEffect(() => {
    elapsedRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(0);
  }, [groupIndex, storyIndex]);

  // Drive the progress bar / auto-advance, pausable without losing elapsed time.
  useEffect(() => {
    if (paused || !story) return;
    const interval = setInterval(() => {
      elapsedRef.current += TICK_MS;
      const pct = Math.min(100, (elapsedRef.current / STORY_DURATION_MS) * 100);
      setProgress(pct);
      if (elapsedRef.current >= STORY_DURATION_MS) {
        clearInterval(interval);
        goNext();
      }
    }, TICK_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, paused, story]);

  function handlePointerDown() {
    pointerDownAt.current = Date.now();
    holdTimeout.current = setTimeout(() => setPaused(true), HOLD_THRESHOLD_MS);
  }

  function handlePointerUp(e: React.PointerEvent) {
    clearTimeout(holdTimeout.current);
    const heldFor = Date.now() - pointerDownAt.current;
    setPaused(false);
    if (heldFor < HOLD_THRESHOLD_MS) {
      const x = e.clientX;
      if (x < window.innerWidth * 0.3) goPrev();
      else goNext();
    }
  }

  if (!group || !story) {
    close();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black pt-safe pb-safe">
      <div
        className="relative mx-auto h-full max-w-md select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setPaused(false)}
      >
        <Image
          src={story.mediaUrl}
          alt={story.caption ?? ""}
          fill
          sizes="480px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

        <div className="absolute inset-x-0 top-0 flex gap-1 p-2">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className={cn("h-full bg-white", i === storyIndex ? "" : "transition-none")}
                style={{
                  width: `${i < storyIndex ? 100 : i === storyIndex ? progress : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-4 flex items-center gap-2.5 px-3">
          <Avatar className="size-8 border border-white/40">
            <AvatarImage src={group.user.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{group.user.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{group.user.name}</p>
            <p className="text-xs text-white/70">
              {formatDistanceToNow(story.createdAt, { addSuffix: true })}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            className="flex size-8 items-center justify-center rounded-full bg-black/30 text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {story.caption ? (
          <p className="absolute inset-x-0 bottom-6 px-4 text-center text-sm text-white">
            {story.caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}
