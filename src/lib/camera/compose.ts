/**
 * Canvas work behind the photo editor: cropping, and flattening the chosen
 * filter plus any text overlays into the single image that gets uploaded.
 */

/** Normalised (0–1) rectangle, relative to the image it was drawn on. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  /** Centre point, 0–1 of the image box. */
  xPct: number;
  yPct: number;
  color: string;
  /** Font size as a fraction of image width, so preview and export agree at any scale. */
  sizePct: number;
  fontId: string;
}

/** Caps the exported image so a 48MP phone photo doesn't become a 20MB upload. */
const MAX_EXPORT_DIMENSION = 2048;

export const TEXT_COLORS = ["#ffffff", "#2a1b16", "#dbb477", "#62141a", "#4f7d5c"];

export const MIN_TEXT_SIZE = 0.04;
export const MAX_TEXT_SIZE = 0.2;
export const DEFAULT_TEXT_SIZE = 0.08;

/**
 * `cssVar` points at the next/font variables declared on <html>. Those resolve
 * to hashed family names generated at build time, so the real family has to be
 * read from computed styles rather than hardcoded — otherwise canvas silently
 * falls back to a default and the export doesn't match the preview.
 */
export const TEXT_FONTS = [
  { id: "sans", label: "Sans", cssVar: "--font-sans", fallback: "ui-sans-serif, system-ui, sans-serif" },
  { id: "serif", label: "Serif", cssVar: "--font-display", fallback: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", cssVar: null, fallback: "ui-monospace, SFMono-Regular, Menlo, monospace" },
] as const;

export function resolveFontFamily(fontId: string): string {
  const font = TEXT_FONTS.find((f) => f.id === fontId) ?? TEXT_FONTS[0];
  if (!font.cssVar || typeof document === "undefined") return font.fallback;
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(font.cssVar).trim();
  return resolved ? `${resolved}, ${font.fallback}` : font.fallback;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

/**
 * Applies a crop immediately, returning a new data URL.
 *
 * Committing the crop up front (rather than carrying a rect through to
 * export) means text and filters afterwards operate on the image the guest is
 * actually looking at — no mapping between pre- and post-crop coordinates.
 */
export async function cropImage(src: string, rect: CropRect): Promise<string> {
  const img = await loadImage(src);

  const sx = Math.round(rect.x * img.naturalWidth);
  const sy = Math.round(rect.y * img.naturalHeight);
  const sw = Math.max(1, Math.round(rect.width * img.naturalWidth));
  const sh = Math.max(1, Math.round(rect.height * img.naturalHeight));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  // High quality for the intermediate: a crop may be re-encoded several times
  // before export, and each pass compounds.
  return canvas.toDataURL("image/jpeg", 0.95);
}

/** Flattens filter + text overlays into the file that actually gets uploaded. */
export async function composeImage(options: {
  src: string;
  filterCss: string;
  texts: TextOverlay[];
  fileName?: string;
}): Promise<File> {
  const { src, filterCss, texts, fileName = `moment-${Date.now()}.jpg` } = options;
  const img = await loadImage(src);

  const scale = Math.min(1, MAX_EXPORT_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  if (filterCss && filterCss !== "none") ctx.filter = filterCss;
  ctx.drawImage(img, 0, 0, width, height);
  // Text is an overlay, not part of the photograph — leaving the filter on
  // would tint the caption along with the image.
  ctx.filter = "none";

  // Canvas silently substitutes a default face for a font that hasn't finished
  // loading, so the export would not match what the guest positioned.
  if (texts.length > 0 && typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  for (const overlay of texts) {
    const fontSize = overlay.sizePct * width;
    ctx.font = `600 ${fontSize}px ${resolveFontFamily(overlay.fontId)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = overlay.color;
    // Matches the preview's drop shadow, which is what keeps light text
    // readable against a bright photo.
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = fontSize * 0.18;
    ctx.shadowOffsetY = fontSize * 0.04;

    const lines = overlay.text.split("\n");
    const lineHeight = fontSize * 1.2;
    const startY = overlay.yPct * height - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, overlay.xPct * width, startY + i * lineHeight);
    });
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Could not export image");

  return new File([blob], fileName, { type: "image/jpeg" });
}
