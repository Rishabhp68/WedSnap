/**
 * Development seed data: one sample wedding with events, an "Our Story"
 * timeline, a venue, a guest list, posts/comments/reactions, a handful of
 * stories, RSVPs, and a populated group chat.
 *
 * Re-runnable: everything is keyed by a stable slug/email and upserted.
 * Swap the constants below for a real couple's details when going live —
 * nothing else in the app hardcodes wedding content.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fromZonedTime } from "date-fns-tz";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const WEDDING_SLUG = process.env.WEDDING_SLUG || "sameer-and-anjali";
const TIMEZONE = "Asia/Kolkata";

function img(seed: string, w = 1200, h = 1500) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

// Real photography from the actual venue's website — used for the hero,
// cover, and event cards so the invitation shows the real place, not
// generic stock placeholders. (Personal "Our Story" moments still use
// picsum, since there are no real couple photos to seed with yet.)
const VENUE_PHOTOS = {
  // The venue's own Google Maps listing photo — a dusk shot of the heritage
  // property — used as the main hero image.
  heroExterior:
    "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlYWGWw776OOD7A9cx3UfvR3TzAmcy5NZhIt-NjyIQdqp9tuUp-kV7vSKgSX_yAZWYcpi4t-ey22duYaVmMiIgt5PNd1qzdF6tC8K-PCijnY5MRUKjp99iaRYxgrswjnsA0TxcyUg=w1920",
  wedding: "https://www.bundelkhandriverside.com/wp-content/uploads/2022/06/e30ad2fa-9731-4eb2-8d71-7cc2812a3418-1-1024x683.jpg",
  rooms: "https://www.bundelkhandriverside.com/wp-content/uploads/2022/06/515A0745-1024x683.jpg",
  restaurant: "https://www.bundelkhandriverside.com/wp-content/uploads/2022/06/515A1180-1-1024x683.jpg",
  accommodation: "https://www.bundelkhandriverside.com/wp-content/uploads/2022/05/a-1-1024x976.jpg",
};

/** Wall-clock time in the wedding's timezone -> correct UTC instant, regardless of the machine running this script. */
function ist(date: string, time = "10:00"): Date {
  return fromZonedTime(`${date}T${time}:00`, TIMEZONE);
}

// A fixed "now" the rest of the file derives relative activity (posts,
// messages, stories) from, so re-seeding produces the same timestamps no
// matter when it's run.
const NOW = new Date();

function hoursAgo(hours: number) {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000);
}

// Kept only for the "Our Story" timeline, which is placeholder narrative
// content relative to today rather than a real, dated milestone.
function daysFromNow(days: number, hour = 10, minute = 0) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const GUEST_NAMES = [
  "Rohan Malhotra",
  "Ananya Kapoor",
  "Vikram Singh",
  "Neha Sharma",
  "Karan Mehta",
  "Divya Iyer",
  "Aditya Rao",
  "Simran Chawla",
  "Sameer's Mama Ji",
  "Anjali's Chachi",
  "Ishaan Verma",
  "Meera Nair",
  "Siddharth Joshi",
  "Kavya Reddy",
  "Rahul Bhatia",
  "Tanya Oberoi",
];

async function main() {
  console.log(`Seeding wedding "${WEDDING_SLUG}"...`);

  // ---------------------------------------------------------------------
  // Wedding + Venue
  // ---------------------------------------------------------------------
  const VENUE_NAME = "Hotel Bundelkhand Riverside";
  const VENUE_ADDRESS = "Kothi Ghat, Orchha, Madhya Pradesh - 472246, India";
  const VENUE_MAP_URL = "https://maps.app.goo.gl/Jw5L41AsNwMdMU6QA";

  const wedding = await prisma.wedding.upsert({
    where: { slug: WEDDING_SLUG },
    update: {},
    create: {
      slug: WEDDING_SLUG,
      partnerOneName: "Sameer",
      partnerTwoName: "Anjali",
      tagline: "Two families, one celebration — join us on the banks of the Betwa.",
      weddingDate: ist("2026-12-11", "18:00"),
      timezone: TIMEZONE,
      heroImageUrl: VENUE_PHOTOS.heroExterior,
      coverImageUrl: VENUE_PHOTOS.wedding,
      venue: {
        create: {
          name: VENUE_NAME,
          address: VENUE_ADDRESS,
          mapUrl: VENUE_MAP_URL,
          parkingInfo: "On-site parking is available within the hotel premises.",
          instructions:
            "Hotel Bundelkhand Riverside is a heritage property on the River Betwa in Orchha — please plan extra travel time from Jhansi or Gwalior, and reach out to the couple if you need help arranging transport.",
        },
      },
    },
    include: { venue: true },
  });

  // ---------------------------------------------------------------------
  // Our Story timeline
  // ---------------------------------------------------------------------
  const timelineMoments = [
    {
      title: "How We Met",
      description:
        "A mutual friend's birthday dinner turned into a three-hour conversation neither of us wanted to end.",
      date: daysFromNow(-900, 20, 0),
      imageUrl: img("wedsnap-story-1"),
      order: 0,
    },
    {
      title: "First Date",
      description:
        "Chai and old Bollywood records at a tiny neighborhood café. Sameer still claims he picked the playlist to impress her.",
      date: daysFromNow(-860, 17, 0),
      imageUrl: img("wedsnap-story-2"),
      order: 1,
    },
    {
      title: "Moving In Together",
      description:
        "Two families, four suitcases, and one very opinionated cat later, home became a two-bedroom flat of their own.",
      date: daysFromNow(-420, 12, 0),
      imageUrl: img("wedsnap-story-3"),
      order: 2,
    },
    {
      title: "The Proposal",
      description:
        "On a monsoon evening by the water, Sameer got down on one knee — and Anjali said yes before he finished the sentence.",
      date: daysFromNow(-180, 19, 0),
      imageUrl: img("wedsnap-story-4"),
      order: 3,
    },
    {
      title: "The Wedding",
      description:
        "Now, surrounded by everyone we love on the banks of the Betwa, we're ready to say 'I do' and start the next chapter together.",
      date: ist("2026-12-11", "18:00"),
      imageUrl: img("wedsnap-story-5"),
      order: 4,
    },
  ];
  for (const moment of timelineMoments) {
    const existing = await prisma.timelineMoment.findFirst({
      where: { weddingId: wedding.id, title: moment.title },
    });
    if (!existing) {
      await prisma.timelineMoment.create({ data: { ...moment, weddingId: wedding.id } });
    }
  }

  // ---------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------
  const events = [
    {
      name: "Mehendi",
      description: "An afternoon of henna, music, and dholki by the riverside lawn.",
      date: ist("2026-12-10"),
      startTime: ist("2026-12-10", "11:00"),
      endTime: ist("2026-12-10", "14:00"),
      venueName: `${VENUE_NAME}, Riverside Lawn`,
      venueAddress: VENUE_ADDRESS,
      dressCode: "Vibrant Indian wear — yellows & greens",
      imageUrl: VENUE_PHOTOS.rooms,
      mapUrl: VENUE_MAP_URL,
      order: 0,
    },
    {
      name: "Haldi",
      description: "A joyful turmeric ceremony blessing both Sameer and Anjali.",
      date: ist("2026-12-10"),
      startTime: ist("2026-12-10", "15:30"),
      endTime: ist("2026-12-10", "17:30"),
      venueName: `${VENUE_NAME}, Poolside Deck`,
      venueAddress: VENUE_ADDRESS,
      dressCode: "Wear yellow — and clothes you don't mind staining!",
      imageUrl: VENUE_PHOTOS.accommodation,
      mapUrl: VENUE_MAP_URL,
      order: 1,
    },
    {
      name: "Sangeet",
      description: "A night of family performances, music, and dancing under the stars.",
      date: ist("2026-12-10"),
      startTime: ist("2026-12-10", "19:30"),
      endTime: ist("2026-12-10", "23:30"),
      venueName: `${VENUE_NAME}, Heritage Courtyard`,
      venueAddress: VENUE_ADDRESS,
      dressCode: "Indo-western formal — shine bright",
      imageUrl: VENUE_PHOTOS.restaurant,
      mapUrl: VENUE_MAP_URL,
      order: 2,
    },
    {
      name: "Wedding Ceremony",
      description: "The main event — vows and rituals at a riverside mandap as the sun sets over the Betwa.",
      date: ist("2026-12-11"),
      startTime: ist("2026-12-11", "18:00"),
      endTime: ist("2026-12-11", "21:00"),
      venueName: `${VENUE_NAME}, Riverside Mandap`,
      venueAddress: VENUE_ADDRESS,
      dressCode: "Traditional formal — reds & golds encouraged",
      imageUrl: VENUE_PHOTOS.wedding,
      mapUrl: VENUE_MAP_URL,
      order: 3,
    },
    {
      name: "Reception",
      description: "An elegant evening celebration to toast the newlyweds.",
      date: ist("2026-12-11"),
      startTime: ist("2026-12-11", "21:30"),
      endTime: ist("2026-12-11", "23:59"),
      venueName: `${VENUE_NAME}, Grand Lawn`,
      venueAddress: VENUE_ADDRESS,
      dressCode: "Black tie / formal Indian wear",
      imageUrl: VENUE_PHOTOS.rooms,
      mapUrl: VENUE_MAP_URL,
      order: 4,
    },
  ];
  for (const event of events) {
    const existing = await prisma.event.findFirst({
      where: { weddingId: wedding.id, name: event.name },
    });
    if (!existing) {
      await prisma.event.create({ data: { ...event, weddingId: wedding.id } });
    }
  }

  // ---------------------------------------------------------------------
  // Guests (Users + WeddingGuest + group ChatMember)
  // ---------------------------------------------------------------------
  const groupRoom = await prisma.chatRoom.upsert({
    where: { id: `${wedding.id}-group` }, // never matches on first run; falls through to create
    update: {},
    create: {
      id: `${wedding.id}-group`,
      weddingId: wedding.id,
      type: "GROUP",
      name: "Wedding Guests",
    },
  });

  const guests = [];
  for (let i = 0; i < GUEST_NAMES.length; i++) {
    const name = GUEST_NAMES[i];
    const clerkId = `seed_clerk_${i}`;
    const email = `guest${i}@example.com`;

    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { name },
      create: {
        clerkId,
        name,
        email,
        avatarUrl: img(`wedsnap-avatar-${i}`, 200, 200),
        bio: i === 0 ? "Best man, occasional DJ, full-time chaos coordinator." : undefined,
      },
    });

    const guest = await prisma.weddingGuest.upsert({
      where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
      update: {},
      create: {
        weddingId: wedding.id,
        userId: user.id,
        role: i === 0 ? "ADMIN" : "GUEST",
      },
    });

    await prisma.chatMember.upsert({
      where: { chatRoomId_userId: { chatRoomId: groupRoom.id, userId: user.id } },
      update: {},
      create: { chatRoomId: groupRoom.id, userId: user.id },
    });

    guests.push({ user, guest });
  }

  // ---------------------------------------------------------------------
  // RSVPs — most have responded, a few are still pending (no row at all).
  // ---------------------------------------------------------------------
  const rsvpPlan: Array<"ATTENDING" | "NOT_ATTENDING" | "MAYBE"> = [
    "ATTENDING",
    "ATTENDING",
    "ATTENDING",
    "MAYBE",
    "ATTENDING",
    "NOT_ATTENDING",
    "ATTENDING",
    "ATTENDING",
    "MAYBE",
    "ATTENDING",
  ];
  for (let i = 0; i < rsvpPlan.length; i++) {
    const { user } = guests[i];
    await prisma.rSVP.upsert({
      where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
      update: {},
      create: {
        weddingId: wedding.id,
        userId: user.id,
        status: rsvpPlan[i],
        guestCount: rsvpPlan[i] === "ATTENDING" ? 1 + (i % 3) : 1,
        message: rsvpPlan[i] === "ATTENDING" ? "Can't wait to celebrate with you both!" : undefined,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Posts + Comments + Reactions
  // ---------------------------------------------------------------------
  const postCaptions = [
    "Mehendi hands and happy hearts 🌿",
    "This dholki circle got WILD tonight",
    "Pre-wedding jitters and chai o'clock",
    "Found the best biryani stall outside the venue, send help",
    "Rehearsal chaos but make it fashion",
    "The aunties have officially taken over the dance floor",
    "Someone stop Rohan from giving another speech",
    "Sunset at the venue, no filter needed",
    "Haldi ceremony glow-up in progress",
    "Sangeet practice round 47",
    "The mandap decor is unreal, can't wait for tomorrow",
    "Family photo before the chaos begins",
  ];
  const reactionTypes: Array<"LIKE" | "LOVE" | "HAHA" | "WOW" | "CELEBRATE"> = [
    "LOVE",
    "LIKE",
    "HAHA",
    "WOW",
    "CELEBRATE",
  ];

  for (let i = 0; i < postCaptions.length; i++) {
    const author = guests[i % guests.length];
    const existing = await prisma.post.findFirst({
      where: { weddingId: wedding.id, caption: postCaptions[i] },
    });
    if (existing) continue;

    const post = await prisma.post.create({
      data: {
        weddingId: wedding.id,
        userId: author.user.id,
        caption: postCaptions[i],
        createdAt: hoursAgo(postCaptions.length - i),
        media: {
          create: {
            storageKey: `seed/posts/post-${i}`,
            url: img(`wedsnap-post-${i}`, 1080, 1350),
            mimeType: "image/jpeg",
            mediaType: "IMAGE",
            width: 1080,
            height: 1350,
            sizeBytes: 240_000,
          },
        },
      },
    });

    // A handful of reactions from other guests.
    const reactingGuests = guests.filter((_, idx) => idx !== i % guests.length).slice(0, 4 + (i % 5));
    for (const [ri, reactor] of reactingGuests.entries()) {
      await prisma.reaction.create({
        data: {
          postId: post.id,
          userId: reactor.user.id,
          type: reactionTypes[(i + ri) % reactionTypes.length],
        },
      });
    }

    // A couple of comments.
    if (i % 2 === 0) {
      const commenter = guests[(i + 3) % guests.length];
      await prisma.comment.create({
        data: {
          postId: post.id,
          userId: commenter.user.id,
          content: "This is the best one yet 😍",
          createdAt: hoursAgo(postCaptions.length - i - 1),
        },
      });
    }
    if (i % 3 === 0) {
      const commenter = guests[(i + 5) % guests.length];
      await prisma.comment.create({
        data: {
          postId: post.id,
          userId: commenter.user.id,
          content: "Can someone send me this in full res!",
          createdAt: hoursAgo(postCaptions.length - i - 0.5),
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Stories (Wedding Moments) — short-lived, so keep them fresh.
  // ---------------------------------------------------------------------
  const storyPlan = [0, 1, 2, 4].map((guestIdx, i) => ({ guestIdx, i }));
  for (const { guestIdx, i } of storyPlan) {
    const author = guests[guestIdx];
    const createdAt = hoursAgo(6 - i); // posted a few hours ago
    await prisma.story.create({
      data: {
        weddingId: wedding.id,
        userId: author.user.id,
        storageKey: `seed/stories/story-${i}`,
        mediaUrl: img(`wedsnap-story-moment-${i}`, 1080, 1920),
        mediaType: "IMAGE",
        caption: ["Getting ready!", "On our way 🚗", "The venue looks incredible", "Cheers to tonight 🥂"][i],
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000), // 24h story lifetime
      },
    });
  }

  // ---------------------------------------------------------------------
  // Group chat messages
  // ---------------------------------------------------------------------
  const chatLines = [
    "Welcome everyone! So excited to celebrate with all of you 💛",
    "What time should we get to the venue tomorrow?",
    "Doors open at 5, ceremony starts at 6 sharp!",
    "Can't believe it's finally happening, see you all soon",
    "Does anyone have a spare dupatta pin? Emergency 😅",
    "The mehendi artist is INCREDIBLE, everyone go get in line",
    "Parking is at the east gate btw, valet is free",
    "Someone please save me a plate of the biryani",
    "This might be the best sangeet performance I've ever seen",
    "Crying already and the wedding hasn't even started",
    "Reminder: reception dress code is black tie!",
    "Group photo at 7 outside the mandap, don't be late",
    "Safe travels to everyone flying in today ✈️",
    "The weather looks perfect for tomorrow, thank god",
    "Who's in charge of the playlist tonight, it's incredible",
  ];
  for (let i = 0; i < chatLines.length; i++) {
    const sender = guests[i % guests.length];
    const existing = await prisma.message.findFirst({
      where: { chatRoomId: groupRoom.id, content: chatLines[i] },
    });
    if (!existing) {
      await prisma.message.create({
        data: {
          chatRoomId: groupRoom.id,
          userId: sender.user.id,
          content: chatLines[i],
          createdAt: hoursAgo(chatLines.length - i),
        },
      });
    }
  }

  console.log("Seed complete:");
  console.log(`  Wedding: ${wedding.partnerOneName} & ${wedding.partnerTwoName} (${wedding.slug})`);
  console.log(`  Guests: ${guests.length}`);
  console.log(`  Group chat: ${groupRoom.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
