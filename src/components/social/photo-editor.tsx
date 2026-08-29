"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Crop as CropIcon, Loader2, Trash2, Type, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CAMERA_FILTERS, canBakeFilters, type CameraFilter } from "@/lib/camera/filters";
import {
  composeImage,
  cropImage,
  DEFAULT_TEXT_SIZE,
  MAX_TEXT_SIZE,
  MIN_TEXT_SIZE,
  resolveFontFamily,
  TEXT_COLORS,
  TEXT_FONTS,
  type CropRect,
  type TextOverlay,
} from "@/lib/camera/compose";
import { cn } from "@/lib/utils";

interface PhotoEditorProps {
  /** Object URL or data URL of the photo just captured or chosen. */
  src: string;
  onCancel: () => void;
  onDone: (file: File) => void;
}

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
];

const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };
/** Crop opens inset from the edges so the box and its handles are obviously grabbable. */
const INITIAL_CROP: CropRect = { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
const MIN_CROP = 0.1;
const TAP_SLOP_PX = 6;

type DragTarget = "nw" | "ne" | "sw" | "se" | "move" | null;
type Mode = "idle" | "crop" | "placing";

export function PhotoEditor({ src: initialSrc, onCancel, onDone }: PhotoEditorProps) {
  const [src, setSrc] = useState(initialSrc);
  const [mode, setMode] = useState<Mode>("idle");
  const [filter, setFilter] = useState<CameraFilter>(CAMERA_FILTERS[0]);
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [crop, setCrop] = useState<CropRect>(FULL_CROP);
  const [aspect, setAspect] = useState<number | null>(null);
  const [draft, setDraft] = useState<TextOverlay | null>(null);
  const [busy, setBusy] = useState(false);
  const [frameWidth, setFrameWidth] = useState(0);

  const frameRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ target: DragTarget; id?: string; grabX?: number; grabY?: number }>({
    target: null,
  });
  const pressRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const [showFilters] = useState(canBakeFilters);

  // Text size and positions are stored as fractions, so the preview needs the
  // frame's pixel width to render them at the size the export will use.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => setFrameWidth(frame.clientWidth));
    observer.observe(frame);
    setFrameWidth(frame.clientWidth);
    return () => observer.disconnect();
  }, []);

  const pointToFrame = useCallback((clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }, []);

  // --- crop ---------------------------------------------------------------

  const handleCropPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.target) return;
      const point = pointToFrame(e.clientX, e.clientY);
      if (!point) return;

      setCrop((prev) => {
        if (drag.target === "move") {
          // Preserve where inside the box the drag started, rather than
          // snapping the box's centre onto the pointer.
          const x = Math.min(Math.max(0, point.x - (drag.grabX ?? prev.width / 2)), 1 - prev.width);
          const y = Math.min(Math.max(0, point.y - (drag.grabY ?? prev.height / 2)), 1 - prev.height);
          return { ...prev, x, y };
        }

        const right = prev.x + prev.width;
        const bottom = prev.y + prev.height;
        let { x, y, width, height } = prev;

        if (drag.target === "nw" || drag.target === "sw") {
          x = Math.max(0, Math.min(point.x, right - MIN_CROP));
          width = right - x;
        } else {
          width = Math.max(MIN_CROP, Math.min(point.x, 1) - prev.x);
        }
        if (drag.target === "nw" || drag.target === "ne") {
          y = Math.max(0, Math.min(point.y, bottom - MIN_CROP));
          height = bottom - y;
        } else {
          height = Math.max(MIN_CROP, Math.min(point.y, 1) - prev.y);
        }

        if (aspect && frameRef.current) {
          // `aspect` is width:height in image space; the frame already matches
          // the image's ratio, so convert through it to keep the on-screen box
          // the requested shape rather than the normalised one.
          const frameRatio = frameRef.current.clientWidth / frameRef.current.clientHeight;
          height = (width * frameRatio) / aspect;
          if (height > 1) {
            height = 1;
            width = (height * aspect) / frameRatio;
          }
          if (drag.target === "nw" || drag.target === "ne") y = bottom - height;
        }

        width = Math.min(width, 1 - x);
        height = Math.min(height, 1 - y);
        return { x, y, width, height };
      });
    },
    [aspect, pointToFrame],
  );

  function startCropDrag(e: React.PointerEvent, target: DragTarget) {
    e.stopPropagation();
    e.preventDefault();
    const point = pointToFrame(e.clientX, e.clientY);
    dragRef.current = {
      target,
      grabX: point ? point.x - crop.x : undefined,
      grabY: point ? point.y - crop.y : undefined,
    };
  }

  function openCrop() {
    setDraft(null);
    setCrop(INITIAL_CROP);
    setMode("crop");
  }

  async function applyCrop() {
    setBusy(true);
    try {
      setSrc(await cropImage(src, crop));
      setCrop(FULL_CROP);
      setMode("idle");
    } catch {
      toast.error("Couldn't crop that photo.");
    } finally {
      setBusy(false);
    }
  }

  // --- text ---------------------------------------------------------------

  /** Tap anywhere on the photo (in text mode) to start writing at that point. */
  function handleFrameTap(e: React.PointerEvent) {
    if (mode !== "placing") return;
    const point = pointToFrame(e.clientX, e.clientY);
    if (!point) return;
    setDraft({
      id: `text-${Date.now()}`,
      text: "",
      xPct: point.x,
      yPct: point.y,
      color: TEXT_COLORS[0],
      sizePct: DEFAULT_TEXT_SIZE,
      fontId: TEXT_FONTS[0].id,
    });
    setMode("idle");
  }

  // Seeds the editable element once and drops the caret at the end. React never
  // renders children into it, so re-renders for font/colour/size can't disturb
  // the caret or wipe what's being typed.
  useEffect(() => {
    const el = editableRef.current;
    if (!el || !draft) return;
    el.innerText = draft.text;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // Only re-seed when switching to a *different* text, never on restyle.
  }, [draft?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTextPointerMove(e: React.PointerEvent, id: string) {
    if (dragRef.current.target !== "move" || dragRef.current.id !== id) return;
    const press = pressRef.current;
    if (!press) return;

    // Below the slop threshold this is still a tap, not a drag — a finger
    // never holds perfectly still, and treating every stray pixel as a drag
    // would make text impossible to reopen for editing on touch.
    if (!press.moved) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < TAP_SLOP_PX) return;
      press.moved = true;
    }

    const point = pointToFrame(e.clientX, e.clientY);
    if (!point) return;
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, xPct: point.x, yPct: point.y } : t)));
    setDraft((prev) => (prev?.id === id ? { ...prev, xPct: point.x, yPct: point.y } : prev));
  }

  function commitDraft() {
    if (!draft) return;
    const text = (editableRef.current?.innerText ?? draft.text).trim();
    if (!text) {
      setTexts((prev) => prev.filter((t) => t.id !== draft.id));
    } else {
      setTexts((prev) =>
        prev.some((t) => t.id === draft.id)
          ? prev.map((t) => (t.id === draft.id ? { ...draft, text } : t))
          : [...prev, { ...draft, text }],
      );
    }
    setDraft(null);
  }

  function updateDraft(patch: Partial<TextOverlay>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function deleteDraft() {
    if (!draft) return;
    setTexts((prev) => prev.filter((t) => t.id !== draft.id));
    setDraft(null);
  }

  // --- export -------------------------------------------------------------

  async function handleDone() {
    setBusy(true);
    try {
      // Anything still being typed would otherwise be lost on export.
      const pending = draft
        ? (() => {
            const text = (editableRef.current?.innerText ?? "").trim();
            return text ? [...texts.filter((t) => t.id !== draft.id), { ...draft, text }] : texts;
          })()
        : texts;
      const source = crop.width < 0.999 || crop.height < 0.999 ? await cropImage(src, crop) : src;
      onDone(await composeImage({ src: source, filterCss: filter.css, texts: pending }));
    } catch {
      toast.error("Couldn't save your edits. Please try again.");
      setBusy(false);
    }
  }

  const cropping = mode === "crop";
  const overlayStyle = (overlay: TextOverlay): React.CSSProperties => ({
    left: `${overlay.xPct * 100}%`,
    top: `${overlay.yPct * 100}%`,
    transform: "translate(-50%, -50%)",
    fontSize: `${overlay.sizePct * frameWidth}px`,
    fontFamily: resolveFontFamily(overlay.fontId),
    fontWeight: 600,
    color: overlay.color,
    textShadow: "0 1px 6px rgba(0,0,0,0.5)",
  });

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-black">
      <div className="flex shrink-0 items-center justify-between p-4 pt-safe">
        <button
          type="button"
          onClick={onCancel}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Discard photo"
        >
          <X className="size-5" />
        </button>
        <Button onClick={handleDone} disabled={busy} className="h-10 rounded-full px-5">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Next
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        {!cropping && !draft ? (
          <div className="absolute top-2 left-3 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={openCrop}
              aria-label="Crop"
              className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <CropIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setMode((m) => (m === "placing" ? "idle" : "placing"))}
              aria-label="Add text"
              aria-pressed={mode === "placing"}
              className={cn(
                "flex size-11 items-center justify-center rounded-full backdrop-blur-sm transition-colors",
                mode === "placing" ? "bg-white text-black" : "bg-black/50 text-white hover:bg-black/70",
              )}
            >
              <Type className="size-5" />
            </button>
          </div>
        ) : null}

        {mode === "placing" ? (
          <p className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
            Tap anywhere to write
          </p>
        ) : null}

        <div
          ref={frameRef}
          onPointerDown={handleFrameTap}
          className={cn("relative", mode === "placing" && "cursor-text")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- blob:/data: URL, nothing for Next/Image to optimize */}
          <img
            src={src}
            alt=""
            style={{ filter: filter.css }}
            className="max-h-[58vh] w-auto max-w-full object-contain"
          />

          {texts
            .filter((overlay) => overlay.id !== draft?.id)
            .map((overlay) => (
              <div
                key={overlay.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragRef.current = { target: "move", id: overlay.id };
                  pressRef.current = { x: e.clientX, y: e.clientY, moved: false };
                }}
                onPointerMove={(e) => handleTextPointerMove(e, overlay.id)}
                onPointerUp={(e) => {
                  if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                  dragRef.current = { target: null };
                  // A tap (rather than a drag) reopens it for editing.
                  if (!pressRef.current?.moved) setDraft(overlay);
                  pressRef.current = null;
                }}
                style={overlayStyle(overlay)}
                className="absolute cursor-move touch-none text-center leading-tight whitespace-pre-wrap select-none"
              >
                {overlay.text}
              </div>
            ))}

          {/* The caption is typed directly onto the photo — a contentEditable
              styled exactly as the final text, so there is no separate box and
              what you type is what gets drawn. */}
          {draft ? (
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Text on photo"
              onPointerDown={(e) => e.stopPropagation()}
              onInput={(e) => updateDraft({ text: e.currentTarget.innerText })}
              onPaste={(e) => {
                // Keeps pasted content plain, so it can't smuggle in markup
                // or styles the canvas export would ignore anyway.
                e.preventDefault();
                document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
              }}
              style={{ ...overlayStyle(draft), caretColor: draft.color }}
              className="absolute min-w-[1ch] text-center leading-tight outline-none"
            />
          ) : null}

          {cropping ? (
            <div
              className="absolute inset-0 touch-none"
              onPointerMove={handleCropPointerMove}
              onPointerUp={() => {
                dragRef.current = { target: null };
              }}
              onPointerLeave={() => {
                dragRef.current = { target: null };
              }}
            >
              <div className="absolute inset-0 bg-black/60" />
              <div
                onPointerDown={(e) => startCropDrag(e, "move")}
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.width * 100}%`,
                  height: `${crop.height * 100}%`,
                }}
                className="absolute cursor-move border-2 border-white"
              >
                {/* Punches the selection back to full brightness against the
                    dimmed surround, so the crop is legible as you drag. */}
                <div className="absolute inset-0 backdrop-brightness-[2.5]" />
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} className="border border-white/25" />
                  ))}
                </div>
                {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                  <span
                    key={corner}
                    onPointerDown={(e) => startCropDrag(e, corner)}
                    className={cn(
                      "absolute size-8 rounded-full border-2 border-white bg-black/60",
                      corner === "nw" && "-top-4 -left-4 cursor-nwse-resize",
                      corner === "ne" && "-top-4 -right-4 cursor-nesw-resize",
                      corner === "sw" && "-bottom-4 -left-4 cursor-nesw-resize",
                      corner === "se" && "-right-4 -bottom-4 cursor-nwse-resize",
                    )}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* --- bottom panel -------------------------------------------------- */}
      <div className="shrink-0 pb-safe">
        {cropping ? (
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {ASPECTS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setAspect(option.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium",
                    option.value === aspect ? "border-white bg-white text-black" : "border-white/30 text-white",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button size="sm" className="shrink-0 rounded-full" onClick={applyCrop} disabled={busy}>
              <Check className="size-4" /> Apply
            </Button>
          </div>
        ) : draft ? (
          <div className="space-y-3 px-5 py-4">
            <div className="flex items-center gap-2">
              {TEXT_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => updateDraft({ fontId: font.id })}
                  style={{ fontFamily: resolveFontFamily(font.id) }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    draft.fontId === font.id ? "border-white bg-white text-black" : "border-white/30 text-white",
                  )}
                >
                  {font.label}
                </button>
              ))}
              <input
                type="range"
                min={MIN_TEXT_SIZE}
                max={MAX_TEXT_SIZE}
                step={0.005}
                value={draft.sizePct}
                onChange={(e) => updateDraft({ sizePct: Number(e.target.value) })}
                aria-label="Text size"
                className="ml-1 h-1 flex-1 accent-white"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateDraft({ color })}
                    aria-label={`Text colour ${color}`}
                    style={{ backgroundColor: color }}
                    className={cn(
                      "size-7 rounded-full border-2",
                      draft.color === color ? "border-white" : "border-white/30",
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-white hover:bg-white/10"
                  onClick={deleteDraft}
                  aria-label="Delete text"
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button size="sm" className="rounded-full" onClick={commitDraft}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        ) : showFilters ? (
          <div className="no-scrollbar flex gap-6 overflow-x-auto px-5 py-4">
            {CAMERA_FILTERS.map((option) => {
              const active = option.id === filter.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option)}
                  aria-label={option.label}
                  aria-pressed={active}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "block size-14 overflow-hidden rounded-full border-2 transition-transform",
                      active ? "scale-110 border-white" : "border-white/40",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- same in-memory source as the preview */}
                    <img src={src} alt="" style={{ filter: option.css }} className="size-full object-cover" />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium whitespace-nowrap",
                      active ? "text-white" : "text-white/60",
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
