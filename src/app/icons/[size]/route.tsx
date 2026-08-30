import { renderMonogramIcon } from "@/lib/branding/monogram";

/**
 * Manifest icons. Separate from app/icon.tsx because Next's metadata
 * conventions emit hashed URLs, and a manifest needs stable ones it can point
 * at by hand.
 */

// An allowlist rather than a parsed integer: this endpoint is public, and
// `/icons/20000` would otherwise be an invitation to render a 400-megapixel
// image on request.
const SIZES = new Set([192, 512]);

export function generateStaticParams() {
  return [...SIZES].map((size) => ({ size: String(size) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const parsed = Number(size);
  if (!SIZES.has(parsed)) {
    return new Response("Not found", { status: 404 });
  }
  return renderMonogramIcon(parsed);
}
