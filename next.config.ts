import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve CSS/JS/HMR to a phone testing over the LAN IP
  // or through an ngrok tunnel (Next.js blocks cross-origin dev requests by
  // default). Update these if your local IP or ngrok URL changes.
  allowedDevOrigins: ["192.168.1.25", "divinity-blubber-crushing.ngrok-free.dev"],
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
