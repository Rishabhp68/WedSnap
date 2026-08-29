/**
 * Camera looks, expressed as CSS filter strings.
 *
 * The same string drives both the live preview (`style.filter` on the
 * <video>) and the captured frame (`ctx.filter` before drawImage), so what a
 * guest sees is exactly what gets uploaded — no second, drifting definition
 * of each look.
 */
export interface CameraFilter {
  id: string;
  label: string;
  /** A CSS filter value, or "none". */
  css: string;
}

export const CAMERA_FILTERS: CameraFilter[] = [
  { id: "none", label: "Original", css: "none" },
  { id: "golden", label: "Golden", css: "sepia(0.35) saturate(1.35) contrast(1.05) brightness(1.05)" },
  { id: "blush", label: "Blush", css: "saturate(1.3) contrast(0.95) brightness(1.08) hue-rotate(-10deg)" },
  { id: "mono", label: "B&W", css: "grayscale(1) contrast(1.15)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.55) contrast(1.1) brightness(0.95) saturate(0.85)" },
  { id: "fade", label: "Fade", css: "contrast(0.85) saturate(0.8) brightness(1.12)" },
  { id: "cool", label: "Cool", css: "saturate(1.15) hue-rotate(12deg) brightness(1.02)" },
];

/**
 * Whether the browser can bake a filter into a captured frame.
 *
 * `ctx.filter` only reached Safari in 17.4, and there is no cheap polyfill.
 * Where it's missing the filter strip is hidden entirely rather than letting
 * a guest pick a look the upload would silently discard.
 */
export function canBakeFilters(): boolean {
  if (typeof document === "undefined") return false;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  // Functional round-trip rather than `"filter" in ctx`: a presence check can
  // report true for a stubbed no-op property, and false where the property is
  // only defined lazily — either way the filter strip ends up wrong.
  try {
    ctx.filter = "grayscale(1)";
    return ctx.filter === "grayscale(1)";
  } catch {
    return false;
  }
}
