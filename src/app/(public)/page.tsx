import { prisma } from "@/lib/db/client";
import { getCurrentWeddingOrNotFound } from "@/lib/wedding/current";
import { SiteHeader } from "@/components/invitation/site-header";
import { Hero } from "@/components/invitation/hero";
import { CountdownSection } from "@/components/invitation/countdown-section";
import { OurStory } from "@/components/invitation/our-story";
import { EventsSection } from "@/components/invitation/events-section";
import { VenueSection } from "@/components/invitation/venue-section";
import { RsvpSection } from "@/components/invitation/rsvp-section";
import { SiteFooter } from "@/components/invitation/site-footer";

// The invitation rarely changes, so it's served from ISR cache and
// revalidated every 5 minutes rather than hit the database on every visit —
// this is what keeps the public site fast under a burst of guest traffic.
export const revalidate = 300;

export default async function InvitationPage() {
  const wedding = await getCurrentWeddingOrNotFound();

  const [events, timeline] = await Promise.all([
    prisma.event.findMany({ where: { weddingId: wedding.id }, orderBy: { order: "asc" } }),
    prisma.timelineMoment.findMany({ where: { weddingId: wedding.id }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader wedding={wedding} />
      <main className="flex-1">
        <Hero wedding={wedding} />
        <CountdownSection wedding={wedding} />
        <OurStory moments={timeline} />
        <EventsSection events={events} timezone={wedding.timezone} />
        <VenueSection venue={wedding.venue} />
        <RsvpSection />
      </main>
      <SiteFooter wedding={wedding} />
    </div>
  );
}
