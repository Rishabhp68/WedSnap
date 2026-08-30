import { requireGuest } from "@/lib/auth/current-guest";
import { getFeedPostsPage } from "@/lib/data/posts";
import { getActiveStoryGroups } from "@/lib/data/stories";
import { StoryRail } from "@/components/social/story-rail";
import { Feed } from "@/components/social/feed";
import { NotificationPrompt } from "@/components/social/notification-prompt";

export default async function GuestHomePage() {
  const { user, wedding } = await requireGuest();
  const [storyGroups, feedPage] = await Promise.all([
    getActiveStoryGroups(wedding.id),
    getFeedPostsPage(wedding.id, user.id),
  ]);

  return (
    <div className="mx-auto max-w-xl pb-6 pt-safe">
      <div className="px-4 pt-4">
        <h1 className="font-display text-2xl">Wedding Moments</h1>
      </div>
      <NotificationPrompt publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      <StoryRail groups={storyGroups} currentUserId={user.id} />

      <div className="px-4">
        <Feed weddingId={wedding.id} initialPosts={feedPage.posts} initialCursor={feedPage.nextCursor} />
      </div>
    </div>
  );
}
