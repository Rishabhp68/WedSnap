import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { Hero } from "@/components/invitation/hero";
import { CountdownSection } from "@/components/invitation/countdown-section";
import { OurStory } from "@/components/invitation/our-story";
import { EventsSection } from "@/components/invitation/events-section";
import { VenueSection } from "@/components/invitation/venue-section";
import { RsvpForm } from "@/components/invitation/rsvp-form";

export default async function GuestWeddingPage() {
  const { user, wedding } = await requireGuest();

  const [events, venue, timeline, rsvp] = await Promise.all([
    prisma.event.findMany({ where: { weddingId: wedding.id }, orderBy: { order: "asc" } }),
    prisma.venue.findUnique({ where: { weddingId: wedding.id } }),
    prisma.timelineMoment.findMany({ where: { weddingId: wedding.id }, orderBy: { order: "asc" } }),
    prisma.rSVP.findUnique({ where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } } }),
  ]);

  return (
    <div className="pb-6">
      <Hero wedding={wedding} showActions={false} />
      <CountdownSection wedding={wedding} />
      <OurStory moments={timeline} />
      <EventsSection events={events} timezone={wedding.timezone} />
      <VenueSection venue={venue} />

      <section className="px-6 py-10 sm:px-8">
        <div className="mx-auto max-w-lg">
          <h2 className="font-display text-center text-2xl">Your RSVP</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            You can update your response anytime before the big day.
          </p>
          <div className="mt-8">
            <RsvpForm initialStatus={rsvp?.status === "PENDING" ? null : rsvp?.status} />
          </div>
        </div>
      </section>
    </div>
  );
}
