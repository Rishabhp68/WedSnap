import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getCurrentWedding } from "@/lib/wedding/current";

/**
 * Renders the app icon: the same S&A monogram the landing page header shows,
 * in the same typeface.
 *
 * Generated rather than checked in as a PNG because the initials come from the
 * wedding record — a static file would quietly go stale the moment a name is
 * edited in /admin, and the home-screen icon is the one place nobody would
 * think to look.
 */

// Subset to A-Z and "&" — the only glyphs a monogram can contain. The full
// family is ~200KB; this is under 8KB, small enough to read on every request.
const FONT_PATH = join(process.cwd(), "src/assets/fonts/playfair-display-monogram.ttf");

const MAROON = "#62141a";
const IVORY = "#fcf8f0";
/** Matches the header's `text-accent-foreground/60` ampersand. */
const AMPERSAND = "rgba(219, 180, 119, 0.85)";

let fontCache: Buffer | null = null;

async function loadFont() {
  fontCache ??= await readFile(FONT_PATH);
  return fontCache;
}

export async function renderMonogramIcon(size: number) {
  const [wedding, font] = await Promise.all([getCurrentWedding(), loadFont()]);
  const first = wedding.partnerOneName[0]?.toUpperCase() ?? "";
  const second = wedding.partnerTwoName[0]?.toUpperCase() ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: MAROON,
          color: IVORY,
          // Proportional to the canvas so one component serves every size.
          //
          // Sized to sit inside the central ~80% that Android's "maskable"
          // crop guarantees: at the header's visual weight the monogram ran
          // nearly edge to edge, and a circular launcher would have sliced
          // the outer letters off.
          fontSize: size * 0.34,
          fontFamily: "Playfair Display",
          letterSpacing: size * 0.005,
        }}
      >
        <span>{first}</span>
        <span style={{ color: AMPERSAND, fontSize: size * 0.26, padding: `0 ${size * 0.015}px` }}>
          &amp;
        </span>
        <span>{second}</span>
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [{ name: "Playfair Display", data: font, weight: 700, style: "normal" }],
    },
  );
}
