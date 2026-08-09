import { notFound } from "next/navigation";
import { requireGuest } from "@/lib/auth/current-guest";
import { getActiveStoryGroups } from "@/lib/data/stories";
import { StoryViewer } from "@/components/social/story-viewer";

export default async function StoryViewerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { wedding } = await requireGuest();
  const groups = await getActiveStoryGroups(wedding.id);

  const initialIndex = groups.findIndex((g) => g.user.id === userId);
  if (initialIndex === -1) {
    notFound();
  }

  return <StoryViewer groups={groups} initialGroupIndex={initialIndex} />;
}
