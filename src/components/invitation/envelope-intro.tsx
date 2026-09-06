"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

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

/**
 * The bursts fire as the envelope hands over to the page — just before the
 * overlay finishes fading at 2.3s, so the celebration is already in the air by
 * the time the invitation is visible behind it.
 */
const BURST_START = 2.2;
const BURST_PER_CANNON = 44;
const BURST_MAX_JITTER = 0.3;
const BURST_MAX_DURATION = 3.4;

/**
 * Gap between the corner volley and the inner one. Long enough that they land
 * as two separate blasts — the corner cones are well past their apex and
 * falling by the time the inner pair goes off.
 */
const WAVE_DELAY = 1.5;

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
  /** 0 fires on the beat, 1 fires WAVE_DELAY later. */
  wave: 0 | 1;
}

/**
 * Four cannons in two volleys: the corners go off together, then the inner
 * pair a beat later. The second volley is what keeps the middle of the screen
 * busy once the corner cones have passed their apex and started to thin out.
 *
 * The inner pair sits closer to centre, so it's aimed higher and sprays a
 * bigger share backwards — a narrow cone from mid-screen would read as a
 * fountain rather than a cannon.
 */
const CANNONS: Cannon[] = [
  { x: 4, aim: 1, reach: 66, back: 0.08, lift: 46, wave: 0 },
  { x: 92, aim: -1, reach: 66, back: 0.08, lift: 46, wave: 0 },
  { x: 27, aim: 1, reach: 42, back: 0.34, lift: 54, wave: 1 },
  { x: 69, aim: -1, reach: 42, back: 0.34, lift: 54, wave: 1 },
];

/**
 * How long the whole celebration layer has to stay mounted: whichever of the
 * drifting shower and the cannon bursts is last to leave the screen.
 */
const CELEBRATION_LIFETIME_MS =
  Math.max(
    MAX_DELAY + MAX_DURATION,
    BURST_START + WAVE_DELAY + BURST_MAX_JITTER + BURST_MAX_DURATION,
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

function makePetals(): Petal[] {
  return Array.from({ length: PETAL_COUNT }, (_, i) => {
    // Bigger petals fall faster and sit more opaque — a cheap depth cue that
    // stops 60 identical specks from reading as a flat sheet.
    const depth = Math.random();
    return {
      // Seeded across the width in even lanes, then jittered, so a random
      // draw can't leave a bare column down the middle of the screen.
      left: (i / PETAL_COUNT) * 100 + Math.random() * (100 / PETAL_COUNT),
      size: 13 + depth * 20,
      delay: Math.random() * MAX_DELAY,
      duration: MAX_DURATION - depth * 2,
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
        delay: BURST_START + cannon.wave * WAVE_DELAY + Math.random() * BURST_MAX_JITTER,
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
function PetalShower({ petals, sparks }: { petals: Petal[]; sparks: Spark[] }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-110 overflow-hidden">
      <PetalGradients />
      <BurstCannons sparks={sparks} />
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
    </div>
  );
}

interface EnvelopeIntroProps {
  partnerOneName: string;
  partnerTwoName: string;
  dateLabel: string;
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

  // Randomised once, and only ever read after a tap — the server render never
  // includes petals, so there's nothing here to mismatch during hydration.
  const petals = useMemo(() => makePetals(), []);
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

  // Lock background scrolling only while the envelope is actually on screen.
  // The petal layer is pointer-events-none, so it never needs the lock.
  useEffect(() => {
    if (dismissed) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [dismissed]);

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
          setFinished(true);
        }, 250),
      );
      return;
    }

    timers.current.push(setTimeout(() => setDismissed(true), 2300));
    timers.current.push(setTimeout(() => setFinished(true), CELEBRATION_LIFETIME_MS));
  }, [opening, shouldReduceMotion]);

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
      setOpening(false);
    };
    window.addEventListener(REPLAY_ENVELOPE_EVENT, replay);
    return () => window.removeEventListener(REPLAY_ENVELOPE_EVENT, replay);
  }, [clearTimers]);

  if (finished) return null;

  // Petals are skipped entirely under reduced motion rather than being left
  // frozen mid-air by the global animation-duration override.
  const shower = opening && !shouldReduceMotion ? <PetalShower petals={petals} sparks={sparks} /> : null;

  if (dismissed) return shower;

  return (
    <>
      {shower}
      <motion.div
        data-envelope-intro
        role="dialog"
        aria-label="Open your invitation"
        className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-12 bg-background px-6"
        animate={{ opacity: opening ? 0 : 1 }}
        transition={{
          duration: shouldReduceMotion ? 0.25 : 0.6,
          delay: opening && !shouldReduceMotion ? 1.6 : 0,
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
            <div className="absolute inset-0 z-10 rounded-xl bg-secondary shadow-[0_18px_40px_-12px_rgba(0,0,0,0.28)]" />

            {/* The card, tucked fully inside until the flap lifts. */}
            <motion.div
              className="absolute inset-x-5 top-[9%] z-20 flex h-[80%] flex-col items-center justify-center gap-2.5 rounded-md bg-card px-5 text-center shadow-sm"
              animate={opening ? { y: shouldReduceMotion ? 0 : "-64%" } : { y: 0 }}
              transition={{ duration: 1, delay: shouldReduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[9px] tracking-[0.28em] text-muted-foreground uppercase">
                Together with their families
              </p>
              <p className="font-display text-2xl leading-tight text-primary sm:text-[28px]">
                {partnerOneName}
                <span className="mx-1.5 italic text-accent-foreground/70">&amp;</span>
                {partnerTwoName}
              </p>
              <div aria-hidden className="h-px w-10 bg-accent/60" />
              <p className="text-[10px] tracking-wide text-muted-foreground">{dateLabel}</p>
            </motion.div>

            {/* Front pocket: leaves a V notch at the top that the flap fills. */}
            <div
              className="absolute inset-0 z-30 rounded-xl bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_4%)]"
              style={{ clipPath: "polygon(0 0, 50% 46%, 100% 0, 100% 100%, 0 100%)" }}
            />
            <div
              aria-hidden
              className="absolute inset-0 z-30 rounded-xl"
              style={{
                clipPath: "polygon(0 0, 50% 46%, 100% 0, 100% 100%, 0 100%)",
                boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--accent), transparent 65%)",
              }}
            />

            {/* Top flap, hinged along the envelope's top edge. */}
            <motion.div
              className="absolute inset-x-0 top-0 z-40 h-[63%] origin-top rounded-t-xl bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_9%)]"
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", backfaceVisibility: "hidden" }}
              animate={opening ? { rotateX: shouldReduceMotion ? 0 : -175 } : { rotateX: 0 }}
              transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
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
