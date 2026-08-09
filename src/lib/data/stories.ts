import { prisma } from "@/lib/db/client";
import { resolveMediaUrl } from "@/lib/storage/resolve";

/** Guests whose "Wedding Moments" haven't expired yet, grouped for the story rail — most recently active guest first. */
export async function getActiveStoryGroups(weddingId: string) {
  const stories = await prisma.story.findMany({
    where: { weddingId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  const byUser = new Map<string, typeof stories>();
  for (const story of stories) {
    const list = byUser.get(story.userId) ?? [];
    list.push(story);
    byUser.set(story.userId, list);
  }

  return Array.from(byUser.values()).map((group) => ({
    user: group[0].user,
    stories: group
      .slice()
      .reverse() // oldest first within a user's group, so the viewer plays chronologically
      .map((s) => ({
        ...s,
        mediaUrl: resolveMediaUrl({ storageKey: s.storageKey, url: s.mediaUrl, mediaType: s.mediaType }, { width: 1080 }),
      })),
  }));
}

export type StoryGroup = Awaited<ReturnType<typeof getActiveStoryGroups>>[number];
