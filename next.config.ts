import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve CSS/JS/HMR to a phone testing over the LAN IP
  // or through an ngrok tunnel (Next.js blocks cross-origin dev requests by
  // default, and the symptom is a page that loads but renders unstyled with
  // no text — not an obvious error).
  //
  // The subnet is wildcarded rather than pinned to one address because the
  // router hands out a new IP every so often, and a stale entry here breaks
  // phone testing in a way that looks like a CSS bug. Next matches these
  // segment by segment, so "192.168.1.*" covers the whole subnet and nothing
  // beyond it. Dev-only config; it has no effect on a production build.
  allowedDevOrigins: ["192.168.1.*", "divinity-blubber-crushing.ngrok-free.dev"],
  images: {
    // Admins paste image URLs from arbitrary sites (the venue's website, a
    // photographer's gallery, Google Maps) into /admin, and next/image
    // refuses any hostname not listed here — so an allowlist would mean
    // "add an image by URL" silently produced broken images. Any https host
    // is allowed instead.
    //
    // Trade-off: /_next/image will proxy+optimize images from any https URL,
    // which counts against image-optimization quota on Vercel. Acceptable
    // here (only ~admins paste URLs, traffic is one wedding's guests); tighten
    // back to a named list if that ever becomes a problem.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
