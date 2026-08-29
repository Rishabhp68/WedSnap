"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Instagram-style playback: a post's video starts when it scrolls into view
 * and pauses when it leaves, so only the clip being looked at is decoding.
 *
 * Starts muted by design — every browser blocks autoplay with sound, and an
 * unmuted `play()` would reject and leave a dead frame instead of a video.
 */
export function FeedVideo({ src, caption }: { src: string; caption: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  // 60% visible before playing, so a clip half off-screen mid-scroll doesn't
  // start up only to be paused again a moment later.
  const { ref: inViewRef, inView } = useInView({ threshold: 0.6 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) {
      // Rejects if the tab is backgrounded or the gesture policy blocks it;
      // there's nothing to recover, so the frozen poster frame just stays.
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [inView]);

  return (
    <div ref={inViewRef} className="relative aspect-4/5 w-full bg-muted">
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={caption || "Guest video"}
        className="absolute inset-0 size-full object-cover"
      />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute video" : "Mute video"}
        className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  );
}
