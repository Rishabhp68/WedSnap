"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { VolumeX } from "lucide-react";

/**
 * Longest the film is allowed to hold the screen.
 *
 * `ended` is not guaranteed to fire — a stalled download, a decode failure or
 * a tab that was backgrounded mid-play can all leave the element sitting
 * there. The invitation is the thing guests actually came for, so this
 * eventually hands over regardless.
 */
const HARD_CAP_MS = 45_000;

interface SaveTheDateVideoProps {
  src: string;
  /**
   * False while the envelope is still playing: the element is mounted and
   * buffering, but paused and invisible. True hands it the screen.
   *
   * Mounting early is the point. Left until the hand-off, the browser only
   * starts fetching once the envelope has already gone, and the invitation
   * sits exposed for a second or two while the first frame downloads.
   */
  active: boolean;
  /** Called once, whenever the film is done: played out, skipped, or failed. */
  onFinished: () => void;
}

export function SaveTheDateVideo({ src, active, onFinished }: SaveTheDateVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);
  // Guards against ended + the hard cap + an error all racing to finish.
  const finishedRef = useRef(false);
  // A dead URL errors as soon as the element mounts — which is now during the
  // envelope, long before this has the screen. Finishing then would tear the
  // envelope down mid-animation, so the failure is remembered and acted on at
  // the hand-off, where "skip the film" is the right response.
  const failedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // Fade out first, then hand over — cutting straight to the page is the
    // jarring part of most intro videos.
    setLeaving(true);
    setTimeout(onFinished, 600);
  }, [onFinished]);

  const handleError = useCallback(() => {
    failedRef.current = true;
    if (active) finish();
  }, [active, finish]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;

    if (failedRef.current) {
      finish();
      return;
    }

    // Try with sound: opening the envelope was a deliberate tap, which is the
    // user activation browsers require. If this environment declines anyway
    // (Safari is stricter, and iOS Low Power Mode refuses outright), fall back
    // to muted rather than leaving a frozen first frame on screen.
    let cancelled = false;
    void video.play().catch(() => {
      if (cancelled) return;
      video.muted = true;
      setMuted(true);
      void video.play().catch(finish);
    });

    const cap = setTimeout(finish, HARD_CAP_MS);
    return () => {
      cancelled = true;
      clearTimeout(cap);
    };
  }, [active, finish]);

  // Scroll locking is deliberately NOT done here. EnvelopeIntro holds one lock
  // across the whole intro, because this component's lifetime overlaps the
  // envelope overlay's: capturing and restoring in both would have this one
  // capture "hidden" from the envelope and then restore it after the envelope
  // had already let go, leaving the page permanently unscrollable.

  return (
    <motion.div
      role={active ? "dialog" : undefined}
      aria-label="Save the date"
      aria-hidden={!active}
      // pointer-events-none while invisible, or this would swallow the tap
      // that opens the envelope — it sits above everything at z-120.
      className={`fixed inset-0 z-120 bg-black ${active ? "" : "pointer-events-none"}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: active && !leaving ? 1 : 0 }}
      transition={{ duration: leaving ? 0.6 : 0.5, ease: "easeInOut" }}
    >
      <video
        ref={videoRef}
        src={src}
        // No `controls`, so there's no scrubber or time bar at any point.
        playsInline
        muted={muted}
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onEnded={finish}
        onError={handleError}
        className="h-full w-full object-cover"
      />

      {active && muted ? (
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = false;
            setMuted(false);
          }}
          className="absolute top-5 left-5 flex h-10 items-center gap-2 rounded-full bg-black/45 px-4 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/65"
        >
          <VolumeX className="size-4" />
          Sound
        </button>
      ) : null}

      {active ? (
        <button
          type="button"
          onClick={finish}
          className="absolute top-5 right-5 flex h-10 items-center rounded-full bg-black/45 px-4 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/65"
        >
          Skip
        </button>
      ) : null}
    </motion.div>
  );
}
