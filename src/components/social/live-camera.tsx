"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LiveCameraProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Hands back to the device's native camera when getUserMedia is unavailable or blocked. */
  onFallback: () => void;
}

type FacingMode = "user" | "environment";

/**
 * `zoom` and `torch` are camera extensions to the media-track API. They're
 * real on Android Chrome and absent on iOS Safari, and the DOM lib only
 * declares them on MediaTrackSettings — not on capabilities or constraints.
 */
interface CameraCapabilities extends MediaTrackCapabilities {
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
}

declare global {
  // Augmenting rather than casting: a cast to a type with no overlapping
  // members is rejected outright, and this keeps applyConstraints type-checked.
  interface MediaTrackConstraintSet {
    zoom?: ConstrainDouble;
    torch?: ConstrainBoolean;
  }
}

export const MAX_VIDEO_SECONDS = 15;
const MAX_DIGITAL_ZOOM = 5;
/** How long the shutter must be held before it becomes a recording rather than a photo. */
const HOLD_TO_RECORD_MS = 260;

/**
 * Safari records mp4, Chrome/Firefox webm. Both are in the upload's
 * `allowed_formats`, so whichever the device supports is accepted as-is with
 * no transcode on our side.
 */
function pickRecorderMimeType(): string {
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function LiveCamera({ onCapture, onClose, onFallback }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const holdTimerRef = useRef<number | null>(null);
  const didRecordRef = useRef(false);
  const pinchRef = useRef<{ startDistance: number; startZoom: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const [zoom, setZoom] = useState(1);
  const [nativeZoom, setNativeZoom] = useState<{ min: number; max: number } | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // The viewfinder covers the viewport, so the page behind it must not scroll.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      if (!navigator.mediaDevices) {
        setError("This browser can't open the camera directly.");
        return;
      }
      const video = { facingMode, width: { ideal: 1440 }, height: { ideal: 1920 } };
      try {
        // Audio has to be in the stream up front: recording starts the instant
        // the shutter is held, which is far too late to prompt for a mic.
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
        } catch {
          // A combined request fails outright if *either* device is refused,
          // so retry without audio — a denied mic shouldn't cost the camera.
          stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as CameraCapabilities;
        setNativeZoom(caps.zoom ? { min: caps.zoom.min, max: caps.zoom.max } : null);
        setTorchAvailable(Boolean(caps.torch));
        setZoom(1);
        setTorchOn(false);

        setReady(true);
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError") {
          setError("Camera access is blocked. Allow it in your browser's site settings, or use your device camera.");
        } else if (name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError("Couldn't start the camera.");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      setReady(false);
      streamRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode]);

  /**
   * Applies zoom through the camera driver where the device supports it, and
   * otherwise falls back to scaling the picture. The native path is real
   * optical/sensor zoom at full quality; the fallback is a centre crop, which
   * is the only option on iOS, where the zoom constraint doesn't exist.
   */
  const applyZoom = useCallback(
    (next: number) => {
      const max = nativeZoom?.max ?? MAX_DIGITAL_ZOOM;
      const min = nativeZoom?.min ?? 1;
      const clamped = Math.min(max, Math.max(min, next));
      setZoom(clamped);

      if (nativeZoom) {
        const track = streamRef.current?.getVideoTracks()[0];
        void track
          ?.applyConstraints({ advanced: [{ zoom: clamped }] })
          .catch(() => {});
      }
    },
    [nativeZoom],
  );

  const toggleTorch = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    track
      .applyConstraints({ advanced: [{ torch: next }] })
      .then(() => setTorchOn(next))
      .catch(() => {});
  }, [torchOn]);

  // --- pinch to zoom ------------------------------------------------------

  function handlePinchDown(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function handlePinchMove(e: React.PointerEvent) {
    const points = pointersRef.current;
    if (!points.has(e.pointerId)) return;
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (points.size !== 2) return;

    const [a, b] = [...points.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (!pinchRef.current) {
      pinchRef.current = { startDistance: distance, startZoom: zoom };
      return;
    }
    applyZoom((distance / pinchRef.current.startDistance) * pinchRef.current.startZoom);
  }

  function handlePinchUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  }

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      setRecording(false);
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      if (blob.size === 0) return;
      const extension = type.includes("mp4") ? "mp4" : "webm";
      onCapture(new File([blob], `moment-${Date.now()}.${extension}`, { type }));
    };

    recorder.start();
    setRecording(true);
    setElapsed(0);
  }, [onCapture]);

  // Drives the countdown ring and enforces the hard 15s cap.
  useEffect(() => {
    if (!recording) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_VIDEO_SECONDS) stopRecording();
    }, 100);
    return () => window.clearInterval(id);
  }, [recording, stopRecording]);

  // A recorder left running would keep the camera light on after unmount.
  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.ondataavailable = null;
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
    };
  }, []);

  /**
   * Captures a *raw* frame — no filter is baked in here.
   *
   * Looks are chosen afterwards in the photo editor; applying one at capture
   * too would compound the two and there'd be no way back to the original.
   */
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    // What the guest frames is not the whole sensor frame. The preview is
    // `object-cover` inside a full-screen box, so a 3:4 camera feed shown in a
    // ~9:19.5 phone viewport has most of its width cropped away. Drawing the
    // untouched frame here is what made the photo come out noticeably wider
    // than the viewfinder — so reproduce that cover crop first.
    const boxW = video.clientWidth || video.videoWidth;
    const boxH = video.clientHeight || video.videoHeight;
    const boxAspect = boxW / boxH;
    const frameAspect = video.videoWidth / video.videoHeight;

    let sw =
      frameAspect > boxAspect ? video.videoHeight * boxAspect : video.videoWidth;
    let sh =
      frameAspect > boxAspect ? video.videoHeight : video.videoWidth / boxAspect;

    // Native zoom is already baked into the frames the camera produces; the
    // digital fallback is only a CSS scale on the preview, and it scales the
    // already-covered box about its centre — so it narrows the crop above.
    const digitalZoom = nativeZoom ? 1 : zoom;
    sw /= digitalZoom;
    sh /= digitalZoom;

    const sx = (video.videoWidth - sw) / 2;
    const sy = (video.videoHeight - sh) / 2;

    const canvas = document.createElement("canvas");
    // Rounded, not truncated: the crop maths is fractional and a canvas
    // silently floors a non-integer size, which would shave a pixel column.
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // The selfie preview is mirrored (below), so mirror the capture too —
    // otherwise the photo comes out flipped from what the guest just saw.
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `moment-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }, [facingMode, onCapture, nativeZoom, zoom]);

  // --- shutter gesture: tap = photo, hold = video -------------------------

  const beginPress = useCallback((e?: React.PointerEvent<HTMLButtonElement>) => {
    if (!ready) return;
    // Capturing the pointer keeps pointerup on this button even if the finger
    // drifts off it mid-hold, so a small slide can't silently end the clip.
    if (e) e.currentTarget.setPointerCapture(e.pointerId);
    didRecordRef.current = false;
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      didRecordRef.current = true;
      startRecording();
    }, HOLD_TO_RECORD_MS);
  }, [ready, startRecording]);

  const endPress = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    // Released before the threshold, so it was a tap: take a still. Past it,
    // recording is already running and the release ends the clip.
    if (didRecordRef.current) stopRecording();
    else capture();
    didRecordRef.current = false;
  }, [capture, stopRecording]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    };
  }, []);

  // `fixed inset-0` deliberately escapes the app shell — a viewfinder sharing
  // the screen with the header and bottom nav reads as a widget, not a camera.
  // z-50 clears the nav's z-40.
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black px-8 text-center">
        <p className="max-w-xs text-sm text-white/80">{error}</p>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="rounded-full" onClick={onFallback}>
            Use device camera instead
          </Button>
          <Button variant="ghost" className="rounded-full text-white hover:bg-white/10" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    // h-dvh alongside inset-0: on mobile the dynamic viewport unit tracks the
    // browser chrome collapsing, which a plain inset-0 fixed box does not.
    <div
      className="fixed inset-0 z-50 h-dvh touch-none bg-black"
      onPointerDown={handlePinchDown}
      onPointerMove={handlePinchMove}
      onPointerUp={handlePinchUp}
      onPointerCancel={handlePinchUp}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity",
          ready ? "opacity-100" : "opacity-0",
        )}
        // Mirror and zoom share the transform property, so both live here —
        // as a class, `-scale-x-100` would be silently overridden by an inline
        // scale and the selfie preview would stop mirroring. Native zoom
        // happens inside the camera, so only the digital fallback scales.
        style={{
          transform: `scaleX(${facingMode === "user" ? -1 : 1}) scale(${nativeZoom ? 1 : zoom})`,
        }}
      />

      {/* Scrims keep the white controls legible over a bright viewfinder. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-safe">
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
          aria-label="Close camera"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* Torch is hidden rather than disabled where the device has no
              such capability — iOS exposes no torch control to the web at
              all, and a permanently dead button is worse than none. */}
          {torchAvailable ? (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
              aria-pressed={torchOn}
              className={cn(
                "flex size-10 items-center justify-center rounded-full backdrop-blur-sm transition-colors",
                torchOn ? "bg-white text-black" : "bg-black/45 text-white",
              )}
            >
              {torchOn ? <Zap className="size-5 fill-current" /> : <ZapOff className="size-5" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
            className="flex size-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
            aria-label="Switch camera"
          >
            <RefreshCw className="size-5" />
          </button>
        </div>
      </div>

      {zoom > 1.05 ? (
        <button
          type="button"
          onClick={() => applyZoom(1)}
          aria-label="Reset zoom"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-32 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur-sm"
        >
          {zoom.toFixed(1)}×
        </button>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 pb-safe">
        <p className="mb-3 text-center text-xs font-medium text-white/70">
          {recording ? "Release to stop" : "Tap for photo · Hold to record"}
        </p>

        {/* pb-12 rather than a tighter value: on iOS the browser's own bottom
            toolbar overlaps the fixed viewport, and safe-area-inset-bottom
            does not always account for it — too little padding and the
            shutter sits underneath it. */}
        <div className="flex justify-center pb-12">
          <button
            type="button"
            disabled={!ready}
            aria-label="Tap to take a photo, hold to record video"
            onPointerDown={beginPress}
            onPointerUp={endPress}
            // Cancel still has to end the clip — the browser can take over a
            // gesture (scroll, system UI) without ever sending pointerup.
            onPointerCancel={endPress}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) beginPress();
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") endPress();
            }}
            className="relative flex size-20 touch-none items-center justify-center rounded-full border-4 border-white shadow-lg transition-transform select-none active:scale-95 disabled:opacity-50"
          >
            {/* Countdown ring — depletes as the clip runs, so the gap shows
                time *left*. A conic-gradient with a radial mask draws it as a
                single background, with no SVG arc maths. */}
            {recording ? (
              <span
                className="absolute -inset-2 rounded-full"
                style={{
                  background: `conic-gradient(#ef4444 ${Math.max(0, 1 - elapsed / MAX_VIDEO_SECONDS) * 360}deg, rgba(255,255,255,0.25) 0deg)`,
                  mask: "radial-gradient(circle, transparent 62%, black 64%)",
                  WebkitMask: "radial-gradient(circle, transparent 62%, black 64%)",
                }}
              />
            ) : null}

            {recording ? (
              <span className="text-lg font-bold text-white tabular-nums">
                {Math.ceil(Math.max(0, MAX_VIDEO_SECONDS - elapsed))}
              </span>
            ) : (
              /* A solid inner disc, not a translucent fill — a 30%-white
                 circle is close to invisible against a dark scene. */
              <span className="size-16 rounded-full bg-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
