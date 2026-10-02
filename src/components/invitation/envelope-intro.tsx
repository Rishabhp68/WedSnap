"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SaveTheDateVideo } from "./save-the-date-video";

const SEEN_KEY = "wedsnap:envelope-opened";

/**
 * Fired by ReplayEnvelopeButton to seal the invitation back up.
 *
 * A window event rather than context or a store: the button lives in the site
 * header and the envelope at the page root, two server-rendered subtrees with
 * no common client ancestor. Wrapping the whole page in a provider to connect
 * one button to one overlay would be the heavier change.
 */
export const REPLAY_ENVELOPE_EVENT = "wedsnap:replay-envelope";

/**
 * Real petal silhouettes, drawn on a 0–100 box.
 *
 * A rounded rectangle reads as confetti no matter how it's coloured — the
 * notched heart-shaped tip of a rose petal and the narrow flute of a marigold
 * are what make these legible as flowers at 20px.
 */
const PETAL_SHAPES = [
  // Rose: broad, with the characteristic dip in the middle of the top edge.
  "M50 97C20 88 4 62 8 38 11 18 28 8 41 16c5 3 8 9 9 15 1-6 4-12 9-15 13-8 30 2 33 22 4 24-12 50-42 59Z",
  // Marigold: narrow and fluted, tapering to the point where it met the head.
  "M50 98C41 80 31 60 31 42 31 22 39 6 50 3c11 3 19 19 19 39 0 18-10 38-19 56Z",
  // Almond: the generic single petal, slightly asymmetric so it doesn't twin.
  "M50 3C76 20 90 48 82 72 75 92 60 97 50 97 40 97 25 92 18 72 10 48 24 20 50 3Z",
];

/**
 * Marigold, saffron, turmeric and rose — the palette of a real phoolon ki
 * varsha, not pastel confetti. Three stops each so every petal is lit on one
 * edge and shaded on the other, which is most of what sells the depth.
 */
const PETAL_COLORS = [
  { light: "#fbd08a", base: "#f2a03d", deep: "#d2761b" },
  { light: "#fab78f", base: "#ef7b45", deep: "#c9532a" },
  { light: "#fbe6a2", base: "#f3c64b", deep: "#d3a020" },
  { light: "#fbc9d2", base: "#ee8fa0", deep: "#c9647a" },
  { light: "#f5a0b6", base: "#e05c7e", deep: "#b23c5c" },
  { light: "#fdece7", base: "#f6d2c6", deep: "#dcab99" },
];

const PETAL_COUNT = 60;

const MAX_DELAY = 1.8;
const MAX_DURATION = 5.2;

/**
 * Metallic foils for the cannon bursts. Three stops each, light to dark, so a
 * scrap catches the light on one edge as it tumbles rather than reading as a
 * flat coloured chip.
 */
const GLITTER_COLORS = [
  ["#fdf3c8", "#e8bf49", "#b0801b"],
  ["#fff7e8", "#f2d9a0", "#c09a52"],
  ["#ffe9ec", "#f0aab4", "#c06a78"],
  ["#ffffff", "#dfe3ea", "#a1a8b4"],
  ["#fff3d6", "#f6c453", "#c78f1c"],
];

/* -------------------------------------------------------------------------
   Opening sequence, in seconds from the tap.

   Named and gathered here because the whole thing is a chain — the card can't
   unfold until it's clear of the envelope, the text can't start until the card
   has finished unfolding, and the cannons have to wait for the hand-off. Every
   stage below reads its start from the one before it.
   ------------------------------------------------------------------------- */

/** Card slides up out of the envelope. */
const CARD_OUT_AT = 0.5;
const CARD_OUT_FOR = 1;
/** Envelope dissolves once the card is clear, freeing the space to unfold into. */
const ENVELOPE_FADE_AT = CARD_OUT_AT + 0.8;
/** Lower panel swings down, doubling the card's height. */
const UNFOLD_AT = CARD_OUT_AT + CARD_OUT_FOR + 0.1;
const UNFOLD_FOR = 0.85;
/**
 * The front of the card is printed before it ever leaves the envelope, so its
 * lines come up as the flap lifts — well before the card starts rising at
 * CARD_OUT_AT. Holding them back until the unfold left a blank sheet sliding
 * out, which is the one thing a real invitation never looks like.
 */
const FRONT_TEXT_AT = 0.35;
const FRONT_TEXT_STEP = 0.12;

/** The inside is only printed news once the card has opened to show it. */
const TEXT_AT = UNFOLD_AT + UNFOLD_FOR - 0.35;
const TEXT_STEP = 0.16;
const TEXT_LINES = 4;
/** Card lifts away and the invitation behind it takes over. */
const REVEAL_AT = TEXT_AT + TEXT_LINES * TEXT_STEP + 1.2;

/**
 * The bursts fire on the hand-off, so the celebration is already in the air by
 * the time the invitation is visible behind the card.
 *
 * Their delays are relative to when the cannon elements mount, not to the tap:
 * a save-the-date film can sit between the envelope and the invitation, and a
 * delay measured from the tap would have the confetti go off behind it.
 */
const BURST_PER_CANNON = 44;
const BURST_MAX_JITTER = 0.3;
const BURST_MAX_DURATION = 3.4;

interface Cannon {
  /** Mouth position across the screen, in %. */
  x: number;
  /** Which way the cone leans. */
  aim: 1 | -1;
  /** How far the widest scrap travels sideways, in vw. */
  reach: number;
  /** Share of the cone that sprays back past the mouth, softening its edge. */
  back: number;
  /** Base height of the arc, in vh. */
  lift: number;
}

/**
 * One volley, from the two bottom corners, fired together.
 *
 * There used to be a second pair mid-screen a beat later. A downpour of
 * flowers over the whole screen replaced it: two bursts of the same shape read
 * as a repeat, where a bang followed by a rain of petals reads as a sequence.
 */
const CANNONS: Cannon[] = [
  { x: 4, aim: 1, reach: 66, back: 0.08, lift: 46 },
  { x: 92, aim: -1, reach: 66, back: 0.08, lift: 46 },
];

/* -------------------------------------------------------------------------
   The downpour that follows the bang.

   A second, much denser shower than the one drifting over the envelope, timed
   to begin as the cannon scraps start falling, so the two run into each other
   rather than leaving a lull between them.
   ------------------------------------------------------------------------- */

/** Beat between the cannons going off and the flowers starting to fall. */
const DOWNPOUR_AT = 1.1;
const DOWNPOUR_COUNT = 110;
const DOWNPOUR_MAX_STAGGER = 1.8;
const DOWNPOUR_MAX_DURATION = 4.6;

/** From the tap, how long the drifting shower stays on screen. */
const PETAL_LIFETIME_MS = (MAX_DELAY + MAX_DURATION) * 1000 + 200;

/**
 * From the moment the celebration mounts, how long until the last thing in the
 * air has left the screen — whichever of the volley and the downpour that is.
 */
const CELEBRATION_LIFETIME_MS =
  Math.max(
    BURST_MAX_JITTER + BURST_MAX_DURATION,
    DOWNPOUR_AT + DOWNPOUR_MAX_STAGGER + DOWNPOUR_MAX_DURATION,
  ) *
    1000 +
  200;

interface Petal {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  swayDuration: number;
  spinDuration: number;
  spinDelay: number;
  shape: string;
  color: (typeof PETAL_COLORS)[number];
  opacity: number;
}

interface ShowerConfig {
  count: number;
  /** Seconds before the first petal falls, measured from this set's mount. */
  startAt: number;
  /** How far apart the petals are spread after that. */
  stagger: number;
  longestFall: number;
}

/** The ambient drift over the envelope while it opens. */
const AMBIENT_SHOWER: ShowerConfig = {
  count: PETAL_COUNT,
  startAt: 0,
  stagger: MAX_DELAY,
  longestFall: MAX_DURATION,
};

/** The downpour after the cannons — nearly twice as many, over the whole screen. */
const DOWNPOUR_SHOWER: ShowerConfig = {
  count: DOWNPOUR_COUNT,
  startAt: DOWNPOUR_AT,
  stagger: DOWNPOUR_MAX_STAGGER,
  longestFall: DOWNPOUR_MAX_DURATION,
};

function makePetals({ count, startAt, stagger, longestFall }: ShowerConfig): Petal[] {
  return Array.from({ length: count }, (_, i) => {
    // Bigger petals fall faster and sit more opaque — a cheap depth cue that
    // stops a crowd of identical specks reading as a flat sheet.
    const depth = Math.random();
    return {
      // Seeded across the width in even lanes, then jittered, so a random
      // draw can't leave a bare column down the middle of the screen.
      left: (i / count) * 100 + Math.random() * (100 / count),
      size: 13 + depth * 20,
      delay: startAt + Math.random() * stagger,
      duration: longestFall - depth * 2,
      drift: 20 + Math.random() * 55,
      swayDuration: 1.1 + Math.random() * 1.3,
      spinDuration: 1.8 + Math.random() * 2.6,
      spinDelay: -Math.random() * 4,
      shape: PETAL_SHAPES[i % PETAL_SHAPES.length],
      color: PETAL_COLORS[i % PETAL_COLORS.length],
      opacity: 0.72 + depth * 0.28,
    };
  });
}

interface Spark {
  left: number;
  drift: number;
  peak: number;
  size: number;
  delay: number;
  duration: number;
  spinDuration: number;
  spinDelay: number;
  /** Foil scrap or flower petal — a burst of only one or the other reads as stock confetti. */
  glitter: string | null;
  round: boolean;
  shape: string;
  colorIndex: number;
  opacity: number;
}

/**
 * Every cannon's charge, flattened into one list.
 *
 * The spread and the height are deliberately anti-correlated: a scrap thrown
 * wide gets less of the same launch energy upward, so the far edges of the
 * cone arc lower than its middle. Fanning everything to the same height is the
 * tell that gives away scripted confetti.
 */
function makeSparks(): Spark[] {
  const sparks: Spark[] = [];

  for (const cannon of CANNONS) {
    for (let i = 0; i < BURST_PER_CANNON; i++) {
      const spread = Math.random();
      const isGlitter = Math.random() < 0.58;
      const foil = GLITTER_COLORS[i % GLITTER_COLORS.length];

      sparks.push({
        left: cannon.x + Math.random() * 6,
        drift: (spread * cannon.reach - cannon.reach * cannon.back) * cannon.aim,
        peak: -(cannon.lift + (1 - spread) * 40),
        size: isGlitter ? 7 + Math.random() * 8 : 12 + Math.random() * 12,
        // Cannons in the same volley go off together; the volleys are what's
        // staggered, so it reads as two blasts rather than four pops.
        delay: Math.random() * BURST_MAX_JITTER,
        duration: BURST_MAX_DURATION - Math.random() * 0.9,
        spinDuration: 0.5 + Math.random() * 1.1,
        spinDelay: -Math.random() * 2,
        glitter: isGlitter
          ? `linear-gradient(135deg, ${foil[0]} 0%, ${foil[1]} 52%, ${foil[2]} 100%)`
          : null,
        round: isGlitter && Math.random() < 0.25,
        shape: PETAL_SHAPES[i % PETAL_SHAPES.length],
        colorIndex: i % PETAL_COLORS.length,
        opacity: 0.8 + Math.random() * 0.2,
      });
    }
  }

  return sparks;
}

/**
 * The launch itself: horizontal travel and vertical arc are separate elements
 * so they can carry different easings. Constant-ish sideways drift against a
 * decelerate-then-accelerate rise and fall is what makes the path read as
 * something thrown rather than something sliding along a diagonal.
 */
function BurstCannons({ sparks }: { sparks: Spark[] }) {
  return (
    <>
      {sparks.map((spark, i) => (
        <span
          key={i}
          className="burst"
          style={
            {
              left: `${spark.left}%`,
              "--burst-drift": `${spark.drift}vw`,
              animationDelay: `${spark.delay}s`,
              animationDuration: `${spark.duration}s`,
            } as React.CSSProperties
          }
        >
          <span
            className="burst-arc"
            style={
              {
                "--burst-peak": `${spark.peak}vh`,
                animationDelay: `${spark.delay}s`,
                animationDuration: `${spark.duration}s`,
              } as React.CSSProperties
            }
          >
            <span
              className="petal-spin"
              style={{
                animationDuration: `${spark.spinDuration}s`,
                animationDelay: `${spark.spinDelay}s`,
              }}
            >
              {spark.glitter ? (
                <span
                  className={spark.round ? "glitter glitter--round" : "glitter"}
                  style={{
                    width: spark.size * 0.62,
                    height: spark.size,
                    opacity: spark.opacity,
                    background: spark.glitter,
                  }}
                />
              ) : (
                <svg
                  viewBox="0 0 100 100"
                  width={spark.size}
                  height={spark.size}
                  style={{ opacity: spark.opacity }}
                >
                  <path
                    d={spark.shape}
                    fill={`url(#wedsnap-petal-${spark.colorIndex})`}
                    stroke={PETAL_COLORS[spark.colorIndex].deep}
                    strokeOpacity={0.3}
                    strokeWidth={1.5}
                  />
                </svg>
              )}
            </span>
          </span>
        </span>
      ))}
    </>
  );
}

/**
 * Gradients live once in a hidden defs block and are referenced by `url(#id)`
 * from every petal — 60 petals with their own inline gradient would be 60
 * extra definitions for six actual colours.
 */
function PetalGradients() {
  return (
    <svg aria-hidden className="absolute h-0 w-0" focusable="false">
      <defs>
        {PETAL_COLORS.map((color, i) => (
          <linearGradient key={i} id={`wedsnap-petal-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color.light} />
            <stop offset="55%" stopColor={color.base} />
            <stop offset="100%" stopColor={color.deep} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

/**
 * Petals rained over the whole viewport, plus the cannon bursts — above the
 * envelope and above the invitation it reveals, so the celebration carries
 * across the hand-off instead of being cut off with the overlay.
 *
 * Three nested animations per petal, because one is obviously mechanical:
 * the outer element only falls, the middle one sways across the wind, and the
 * inner one tumbles in 3D so petals turn edge-on as they drop. All three are
 * transform-only, so the whole shower stays on the compositor.
 */
function PetalShower({
  petals,
  sparks,
  downpour,
}: {
  petals: Petal[];
  /** Both null until the invitation is actually being revealed. */
  sparks: Spark[] | null;
  downpour: Petal[] | null;
}) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-110 overflow-hidden">
      <PetalGradients />
      {/* Mounted only at the reveal, which is what starts their CSS delays
          from that moment rather than from the tap. */}
      {sparks ? <BurstCannons sparks={sparks} /> : null}
      {downpour ? <Petals petals={downpour} /> : null}
      <Petals petals={petals} />
    </div>
  );
}

/** One set of falling petals. Rendered twice: the ambient drift, then the downpour. */
function Petals({ petals }: { petals: Petal[] }) {
  return (
    <>
      {petals.map((petal, i) => (
        <span
          key={i}
          className="petal-fall"
          style={{
            left: `${petal.left}%`,
            animationDelay: `${petal.delay}s`,
            animationDuration: `${petal.duration}s`,
          }}
        >
          <span
            className="petal-sway"
            style={
              {
                "--petal-drift": `${petal.drift}px`,
                animationDuration: `${petal.swayDuration}s`,
              } as React.CSSProperties
            }
          >
            <span
              className="petal-spin"
              style={{
                animationDuration: `${petal.spinDuration}s`,
                animationDelay: `${petal.spinDelay}s`,
              }}
            >
              <svg
                viewBox="0 0 100 100"
                width={petal.size}
                height={petal.size}
                style={{ opacity: petal.opacity }}
              >
                <path
                  d={petal.shape}
                  fill={`url(#wedsnap-petal-${PETAL_COLORS.indexOf(petal.color)})`}
                  stroke={petal.color.deep}
                  strokeOpacity={0.3}
                  // Kept thin deliberately: the tumble turns each petal fully
                  // edge-on twice a revolution, and at that instant the stroke
                  // is all that's left — a heavy one flashes as a hairline scratch.
                  strokeWidth={1.5}
                />
              </svg>
            </span>
          </span>
        </span>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------
   Card ornaments

   Line-art rather than filled shapes, and stroked in `currentColor` so each
   one inherits the gold from whatever it's placed in. All drawn on small
   viewBoxes so they stay crisp at the 12-44px they actually render at.
   ------------------------------------------------------------------------- */

/** Temple arch with a finial, sat above the couple's names. */
function ArchMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 46" fill="none" aria-hidden className={className}>
      <g stroke="currentColor" strokeLinecap="round">
        <path d="M4 45V26C4 13 16 3 32 3s28 10 28 23v19" strokeWidth="1.2" />
        <path d="M12 45V27c0-10 9-18 20-18s20 8 20 18v18" strokeWidth="1" opacity="0.5" />
        <path d="M32 3V0" strokeWidth="1.2" />
      </g>
      <circle cx="32" cy="2" r="2" fill="currentColor" />
    </svg>
  );
}

/** Flourish that separates the names from the details. */
function Divider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 12" fill="none" aria-hidden className={className}>
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M2 6h44" />
        <path d="M126 6H82" />
      </g>
      <path d="M64 0l6 6-6 6-6-6z" fill="currentColor" opacity="0.85" />
      <circle cx="52" cy="6" r="1.4" fill="currentColor" opacity="0.7" />
      <circle cx="76" cy="6" r="1.4" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

/**
 * Mandala corner: two quarter-arcs sweeping across the corner with graduated
 * dots in the pocket they leave behind. Drawn once for the top-left and
 * mirrored with transforms for the other three, so the four always match.
 */
function CornerOrnament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" aria-hidden className={className}>
      <g stroke="currentColor" fill="none" strokeLinecap="round">
        <path d="M2 42C2 20 20 2 42 2" strokeWidth="1.1" />
        <path d="M2 31C2 15 15 2 31 2" strokeWidth="0.9" opacity="0.55" />
        <path d="M2 20C2 10 10 2 20 2" strokeWidth="0.8" opacity="0.3" />
      </g>
      <circle cx="9" cy="9" r="2.1" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

/**
 * Corners for one half of the folded card. The card is two panels that only
 * meet once it opens, so each carries the two corners on its own outer edge.
 */
function CardCorners({ half }: { half: "top" | "bottom" }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-2.5 text-accent">
      {half === "top" ? (
        <>
          <CornerOrnament className="absolute top-0 left-0 size-6" />
          <CornerOrnament className="absolute top-0 right-0 size-6 -scale-x-100" />
        </>
      ) : (
        <>
          <CornerOrnament className="absolute bottom-0 left-0 size-6 -scale-y-100" />
          <CornerOrnament className="absolute right-0 bottom-0 size-6 -scale-100" />
        </>
      )}
    </div>
  );
}

/**
 * Optional flourish on opening.
 *
 * Drop an audio file at `public/sounds/invitation-open.mp3` and it plays; with
 * no file the promise rejects and the intro is simply silent. It's fired from
 * the tap handler, which is the only reason a browser will let it through at
 * all — autoplay without a user gesture is blocked.
 */
const INVITATION_SOUND_URL = "/sounds/invitation-open.mp3";

function playFlourish() {
  try {
    const audio = new Audio(INVITATION_SOUND_URL);
    audio.volume = 0.45;
    void audio.play().catch(() => {
      // No file, or the browser declined. Silence is a fine outcome.
    });
  } catch {
    // Audio constructor unavailable; nothing to do.
  }
}

/** One detail on the card, faded up in sequence with the lines around it. */
function CardLine({
  at,
  active,
  immediate,
  className,
  children,
}: {
  /** Seconds from the tap. Absolute rather than an index, because the front
   *  and inside of the card are printed at quite different moments. */
  at: number;
  active: boolean;
  immediate: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
      transition={{
        duration: immediate ? 0.2 : 0.5,
        delay: active && !immediate ? at : 0,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

interface EnvelopeIntroProps {
  partnerOneName: string;
  partnerTwoName: string;
  dateLabel: string;
  /** Shown on the card's lower panel; omitted cleanly when there's no venue yet. */
  venueName?: string | null;
  /**
   * Save-the-date film, played full screen between the envelope and the
   * invitation. Null (the default) skips that step entirely and reveals the
   * invitation directly, exactly as before this existed.
   */
  videoUrl?: string | null;
  /**
   * Whether the envelope is already sealed when the page loads.
   *
   * True on the public invitation, where arriving in an envelope is the point.
   * False inside the app: a guest who is signed in and moving between tabs
   * shouldn't have to dismiss a cover page to reach their own wedding details
   * — there the envelope only appears when they ask for it with the header
   * button, and the whole component renders nothing until then.
   */
  initiallySealed?: boolean;
}

/**
 * The invitation "arrives" as a sealed envelope that opens on tap.
 *
 * It's an overlay on top of the already server-rendered invitation, never a
 * gate in front of it — the page's real content is in the HTML either way,
 * so crawlers, link previews and no-JS visitors are unaffected, and
 * dismissing this reveals a page that's already there.
 *
 * Stacking, closed: card (z-20) sits inside, fully hidden by the pocket
 * (z-30) and the flap (z-40) which together cover the whole envelope. On
 * open the flap rotates back — `backfaceVisibility: hidden` makes it vanish
 * as it passes 90° — and the card rises, its lower half still clipped
 * behind the pocket so it reads as sliding out.
 */
export function EnvelopeIntro({
  partnerOneName,
  partnerTwoName,
  dateLabel,
  venueName,
  videoUrl,
  initiallySealed = true,
}: EnvelopeIntroProps) {
  const shouldReduceMotion = useReducedMotion();
  const [opening, setOpening] = useState(false);
  // Two-stage teardown: `dismissed` removes the envelope overlay, `finished`
  // unmounts everything. They're separate so the petals can keep falling over
  // the revealed invitation after the overlay is gone.
  //
  // Starting both at true is what makes an unsealed mount render nothing at
  // all — server and client agree, so there's no flash to suppress.
  const [dismissed, setDismissed] = useState(!initiallySealed);
  const [finished, setFinished] = useState(!initiallySealed);
  // The film holds the screen between the two; the cannons wait for it.
  const [playingVideo, setPlayingVideo] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // Randomised once, and only ever read after a tap — the server render never
  // includes petals, so there's nothing here to mismatch during hydration.
  const petals = useMemo(() => makePetals(AMBIENT_SHOWER), []);
  const downpour = useMemo(() => makePetals(DOWNPOUR_SHOWER), []);
  const sparks = useMemo(() => makeSparks(), []);

  // The open sequence is driven by timers. They have to be cancellable, or a
  // replay triggered mid-sequence gets torn down seconds later by the previous
  // run's pending dismiss.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  // Already opened earlier in this session (e.g. came back from signing in) —
  // drop it without replaying. A blocking inline script hides it before paint
  // so this never flashes; see EnvelopeSeenScript.
  useEffect(() => {
    if (!initiallySealed) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) {
        // Intentional: sessionStorage only exists on the client, so this is a
        // post-mount read of an external system rather than derived state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDismissed(true);
        setFinished(true);
      }
    } catch {
      // Private browsing can throw on storage access; showing the intro is a fine fallback.
    }
  }, [initiallySealed]);

  // One lock for the whole intro — the envelope overlay and then the film,
  // whose lifetimes overlap. Locking in both components instead would have the
  // second capture the first's "hidden" and restore it after the first had
  // already let go, leaving the page permanently unscrollable.
  //
  // The petal and cannon layers are pointer-events-none, so they never need it.
  const covered = !dismissed || playingVideo;
  useEffect(() => {
    if (!covered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [covered]);

  const open = useCallback(() => {
    if (opening) return;
    setOpening(true);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Non-fatal: worst case the intro plays again next visit.
    }

    if (shouldReduceMotion) {
      timers.current.push(
        setTimeout(() => {
          setDismissed(true);
          // The film is content, not decoration, so reduced motion still gets
          // it — there's just no envelope choreography around it.
          if (videoUrl) setPlayingVideo(true);
          else setFinished(true);
        }, 250),
      );
      return;
    }

    playFlourish();

    if (videoUrl) {
      // Starts as the envelope overlay begins fading, so the two cross-fade
      // instead of flashing the invitation in between.
      timers.current.push(setTimeout(() => setPlayingVideo(true), (REVEAL_AT - 0.35) * 1000));
      timers.current.push(setTimeout(() => setDismissed(true), (REVEAL_AT + 0.25) * 1000));
      // Confetti and teardown wait for the film; see handleVideoFinished.
      return;
    }

    timers.current.push(setTimeout(() => setCelebrating(true), REVEAL_AT * 1000));
    timers.current.push(setTimeout(() => setDismissed(true), (REVEAL_AT + 0.25) * 1000));
    // Whichever outlasts the other. The cannons currently do, but that's a
    // consequence of the timings rather than a guarantee — retune REVEAL_AT
    // and the petals could be the ones still falling.
    timers.current.push(
      setTimeout(
        () => setFinished(true),
        Math.max(PETAL_LIFETIME_MS, REVEAL_AT * 1000 + CELEBRATION_LIFETIME_MS),
      ),
    );
  }, [opening, shouldReduceMotion, videoUrl]);

  /** The film played out, was skipped, or failed — either way, hand over. */
  const handleVideoFinished = useCallback(() => {
    setPlayingVideo(false);
    if (shouldReduceMotion) {
      setFinished(true);
      return;
    }
    setCelebrating(true);
    timers.current.push(setTimeout(() => setFinished(true), CELEBRATION_LIFETIME_MS));
  }, [shouldReduceMotion]);

  // Seal it back up, on request from the header button.
  useEffect(() => {
    const replay = () => {
      clearTimers();
      try {
        sessionStorage.removeItem(SEEN_KEY);
      } catch {
        // Storage is unavailable; the replay itself still works.
      }
      // Drop the pre-paint hint too, or the CSS in globals.css keeps the
      // freshly re-sealed envelope hidden for the rest of the session.
      delete document.documentElement.dataset.envelopeSeen;
      // The guest may be deep in the page; the envelope should hand back a
      // page that starts at the top, the way a first visit does. "instant"
      // rather than "auto" — html carries scroll-behavior: smooth, which
      // "auto" defers to, and the jump would still be animating behind the
      // overlay when the guest re-opens it.
      window.scrollTo({ top: 0, behavior: "instant" });
      setFinished(false);
      setDismissed(false);
      setCelebrating(false);
      setPlayingVideo(false);
      setOpening(false);
    };
    window.addEventListener(REPLAY_ENVELOPE_EVENT, replay);
    return () => window.removeEventListener(REPLAY_ENVELOPE_EVENT, replay);
  }, [clearTimers]);

  if (finished) return null;

  // Petals are skipped entirely under reduced motion rather than being left
  // frozen mid-air by the global animation-duration override.
  const shower =
    opening && !shouldReduceMotion ? (
      <PetalShower
        petals={petals}
        sparks={celebrating ? sparks : null}
        downpour={celebrating ? downpour : null}
      />
    ) : null;

  // Mounted from the moment the envelope is tapped — invisible and paused
  // until `playingVideo` — so it buffers through the four seconds of envelope
  // animation. Mounting it at the hand-off instead meant the browser only
  // began fetching once the envelope had gone, leaving the invitation exposed
  // while the first frame downloaded.
  const film =
    opening && videoUrl ? (
      <SaveTheDateVideo src={videoUrl} active={playingVideo} onFinished={handleVideoFinished} />
    ) : null;

  if (dismissed) {
    return (
      <>
        {shower}
        {film}
      </>
    );
  }

  // Reduced motion collapses the whole chain: no fold, no staggered reveal,
  // just the finished card for a moment. `immediateText` is what stops the
  // details sitting invisible through delays that will never elapse.
  // Boolean(): useReducedMotion() is null until it has read the media query.
  const immediateText = Boolean(shouldReduceMotion);
  // The envelope dissolves once the card is clear of it, which is what frees
  // the space below for the lower panel to unfold into.
  const envelopeGone = opening && !shouldReduceMotion;
  const envelopeFade = { duration: 0.5, delay: ENVELOPE_FADE_AT, ease: "easeOut" } as const;

  return (
    <>
      {shower}
      {film}
      <motion.div
        data-envelope-intro
        role="dialog"
        aria-label="Open your invitation"
        className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-12 bg-background px-6"
        animate={{ opacity: opening ? 0 : 1 }}
        transition={{
          duration: shouldReduceMotion ? 0.25 : 0.55,
          delay: opening && !shouldReduceMotion ? REVEAL_AT - 0.35 : 0,
        }}
      >
        {/* Soft candlelight wash so the flat background isn't dead space. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 42%, color-mix(in oklab, var(--accent), transparent 72%), transparent 62%)",
          }}
        />

        <button
          type="button"
          onClick={open}
          aria-label="Open the invitation"
          className="group relative [perspective:1600px] focus-visible:outline-none"
        >
          <motion.div
            className="relative h-[212px] w-[312px] [transform-style:preserve-3d] sm:h-[248px] sm:w-[364px]"
            animate={
              shouldReduceMotion ? undefined : opening ? { y: -14, scale: 1.03 } : { y: [0, -7, 0] }
            }
            transition={
              opening
                ? { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
                : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {/* Envelope back panel. */}
            <motion.div
              className="absolute inset-0 z-10 rounded-xl bg-secondary shadow-[0_18px_40px_-12px_rgba(0,0,0,0.28)]"
              animate={{ opacity: envelopeGone ? 0 : 1 }}
              transition={envelopeFade}
            />

            {/*
              The card. Two panels: the top one is what's tucked in the
              envelope, the second is absolutely positioned below it so it adds
              no height until it swings down — which is what lets the card open
              to twice its size without the closed state ever being too tall
              for the envelope to hold.
            */}
            <motion.div
              className="absolute inset-x-5 top-[9%] z-20 h-[80%] [transform-style:preserve-3d]"
              animate={opening ? { y: shouldReduceMotion ? 0 : "-50%" } : { y: 0 }}
              transition={{
                duration: CARD_OUT_FOR,
                delay: shouldReduceMotion ? 0 : CARD_OUT_AT,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Upper panel. */}
              {/* No downward shadow: it fell across the lower panel and split
                  one folded card into two stacked ones. The lower panel's
                  shadow grounds the whole card instead. */}
              <div className="relative flex h-full flex-col items-center justify-center gap-1.5 rounded-t-md bg-card px-6 text-center shadow-[0_0_22px_-10px_rgba(42,27,22,0.4)]">
                {/* Runs a pixel past the fold so the side rails read as one
                    continuous frame rather than stopping short twice. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-[7px] top-[7px] -bottom-px rounded-t-sm border border-b-0 border-accent/25"
                />
                <CardCorners half="top" />

                <CardLine at={FRONT_TEXT_AT} active={opening} immediate={immediateText}>
                  <ArchMotif className="h-6 w-9 text-accent" />
                </CardLine>
                <CardLine
                  at={FRONT_TEXT_AT + FRONT_TEXT_STEP}
                  active={opening}
                  immediate={immediateText}
                  className="text-[8px] tracking-[0.3em] text-muted-foreground uppercase"
                >
                  Together with their families
                </CardLine>
                <CardLine
                  at={FRONT_TEXT_AT + 2 * FRONT_TEXT_STEP}
                  active={opening}
                  immediate={immediateText}
                  className="font-display text-[26px] leading-[1.15] text-primary sm:text-[30px]"
                >
                  <div>{partnerOneName}</div>
                  <div className="my-0.5 text-lg italic text-accent-foreground/70">&amp;</div>
                  <div>{partnerTwoName}</div>
                </CardLine>
              </div>

              {/*
                Lower panel, hinged along the fold. Starts rotated a full turn
                away and face-down, so backface-visibility keeps it invisible
                until it swings past vertical and drops into place.
              */}
              <motion.div
                className="absolute inset-x-0 top-full flex h-full origin-top flex-col items-center justify-center gap-2 rounded-b-md bg-card px-6 text-center shadow-[0_18px_36px_-18px_rgba(42,27,22,0.5)]"
                style={{ backfaceVisibility: "hidden" }}
                // Explicit `initial` so the fold is in the server-rendered
                // HTML. Without it Framer emits no transform until hydration,
                // and this panel — anchored at top-full — paints unfolded,
                // hanging a full card's height out of the bottom of a sealed
                // envelope. Invisible on a fast desktop, glaring on a phone.
                initial={{ rotateX: -180 }}
                animate={{ rotateX: opening && !shouldReduceMotion ? 0 : -180 }}
                transition={{ duration: UNFOLD_FOR, delay: UNFOLD_AT, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-[7px] -top-px bottom-[7px] rounded-b-sm border border-t-0 border-accent/25"
                />
                {/* The crease. A folded card has one, and it's what tells the
                    eye these two panels are a single sheet. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-accent/20"
                />
                <CardCorners half="bottom" />

                <CardLine at={TEXT_AT} active={opening} immediate={immediateText}>
                  <Divider className="h-2.5 w-24 text-accent" />
                </CardLine>
                <CardLine
                  at={TEXT_AT + TEXT_STEP}
                  active={opening}
                  immediate={immediateText}
                  className="text-[8px] tracking-[0.24em] text-muted-foreground uppercase"
                >
                  Request the pleasure of your company
                </CardLine>
                <CardLine
                  at={TEXT_AT + 2 * TEXT_STEP}
                  active={opening}
                  immediate={immediateText}
                  className="text-[13px] font-medium tracking-wide text-foreground"
                >
                  {dateLabel}
                </CardLine>
                {venueName ? (
                  <CardLine
                    at={TEXT_AT + 3 * TEXT_STEP}
                    active={opening}
                    immediate={immediateText}
                    className="font-display text-base leading-snug text-secondary-foreground"
                  >
                    {venueName}
                  </CardLine>
                ) : null}
              </motion.div>
            </motion.div>

            {/* Front pocket: leaves a V notch at the top that the flap fills. */}
            <motion.div
              className="absolute inset-0 z-30 rounded-xl bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_4%)]"
              style={{ clipPath: "polygon(0 0, 50% 46%, 100% 0, 100% 100%, 0 100%)" }}
              animate={{ opacity: envelopeGone ? 0 : 1 }}
              transition={envelopeFade}
            />
            <motion.div
              aria-hidden
              className="absolute inset-0 z-30 rounded-xl"
              style={{
                clipPath: "polygon(0 0, 50% 46%, 100% 0, 100% 100%, 0 100%)",
                boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--accent), transparent 65%)",
              }}
              animate={{ opacity: envelopeGone ? 0 : 1 }}
              transition={envelopeFade}
            />

            {/* Top flap, hinged along the envelope's top edge. */}
            <motion.div
              className="absolute inset-x-0 top-0 z-40 h-[63%] origin-top rounded-t-xl bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_9%)]"
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", backfaceVisibility: "hidden" }}
              animate={{
                rotateX: opening && !shouldReduceMotion ? -175 : 0,
                opacity: envelopeGone ? 0 : 1,
              }}
              transition={{ rotateX: { duration: 0.75, ease: [0.4, 0, 0.2, 1] }, opacity: envelopeFade }}
            />

            {/* Wax seal, sitting on the flap's point. */}
            <motion.div
              className="font-display absolute top-[52%] left-1/2 z-50 flex size-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-sm tracking-wider text-primary-foreground shadow-md ring-2 ring-accent/60"
              animate={
                opening
                  ? { scale: 0, opacity: 0, rotate: -25 }
                  : shouldReduceMotion
                    ? undefined
                    : { scale: [1, 1.05, 1] }
              }
              transition={
                opening
                  ? { duration: 0.35, ease: "easeIn" }
                  : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
              }
            >
              {partnerOneName[0]}
              {partnerTwoName[0]}
            </motion.div>
          </motion.div>
        </button>

        <motion.p
          className="relative text-xs tracking-[0.28em] text-muted-foreground uppercase"
          animate={
            opening ? { opacity: 0 } : shouldReduceMotion ? { opacity: 1 } : { opacity: [0.45, 1, 0.45] }
          }
          transition={opening ? { duration: 0.2 } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          Tap to open
        </motion.p>
      </motion.div>
    </>
  );
}

/**
 * Runs before first paint so a guest who already opened the envelope this
 * session never sees it flash back up while React hydrates.
 */
export function EnvelopeSeenScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `try{if(sessionStorage.getItem(${JSON.stringify(SEEN_KEY)})){document.documentElement.dataset.envelopeSeen="1"}}catch(e){}`,
      }}
    />
  );
}
