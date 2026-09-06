import { requireGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { Hero } from "@/components/invitation/hero";
import { CountdownSection } from "@/components/invitation/countdown-section";
import { OurStory } from "@/components/invitation/our-story";
import { EventsSection } from "@/components/invitation/events-section";
import { VenueSection } from "@/components/invitation/venue-section";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { EnvelopeIntro } from "@/components/invitation/envelope-intro";
import { ReplayEnvelopeButton } from "@/components/invitation/replay-envelope-button";
import { formatEventDate } from "@/lib/utils/dates";

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
      {/* Never sealed on arrival — a signed-in guest moving between app tabs
          shouldn't have to dismiss a cover page to reach their own wedding
          details. It renders nothing until the button below summons it. */}
      <EnvelopeIntro
        partnerOneName={wedding.partnerOneName}
        partnerTwoName={wedding.partnerTwoName}
        dateLabel={formatEventDate(wedding.weddingDate, wedding.timezone)}
        initiallySealed={false}
      />

      <div className="relative">
        <Hero wedding={wedding} showActions={false} hasVenue={Boolean(venue)} fullHeight={false} />
        {/* Over the hero photograph rather than in the app's top bar: that bar
            is shared by every tab, and the envelope only exists on this one. */}
        <div className="absolute top-3 right-3 z-20">
          <ReplayEnvelopeButton className="border border-white/25 bg-black/25 text-white backdrop-blur-sm hover:bg-black/40 hover:text-white" />
        </div>
      </div>
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
