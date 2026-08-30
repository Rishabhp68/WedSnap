import type { MetadataRoute } from "next";
import { getCurrentWedding } from "@/lib/wedding/current";

/**
 * Generated rather than a static file in public/ so the installed app is named
 * after the actual couple, and so the icons stay in step with the monogram
 * whenever a name is edited in /admin.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const wedding = await getCurrentWedding();
  const names = `${wedding.partnerOneName} & ${wedding.partnerTwoName}`;
  const initials = `${wedding.partnerOneName[0] ?? ""}&${wedding.partnerTwoName[0] ?? ""}`;

  return {
    name: names,
    // Home-screen labels are truncated hard — the monogram reads where the
    // full names would be cut mid-word.
    short_name: initials,
    description: wedding.tagline ?? `Everything for the wedding of ${names}.`,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#fcf8f0",
    theme_color: "#fbf7f1",
    orientation: "portrait",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops a "maskable" icon to whatever shape the launcher uses,
      // so this one must tolerate having its corners cut — the monogram is
      // centred with wide margins, which is exactly what that needs.
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
