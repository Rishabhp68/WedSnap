import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve CSS/JS/HMR to a phone testing over the LAN IP
  // or through an ngrok tunnel (Next.js blocks cross-origin dev requests by
  // default). Update these if your local IP or ngrok URL changes.
  allowedDevOrigins: ["192.168.1.33", "divinity-blubber-crushing.ngrok-free.dev"],
  images: {
    remotePatterns: [
      // Guest-uploaded photos.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Clerk-hosted profile avatars.
      { protocol: "https", hostname: "img.clerk.com" },
      // Seed/dev placeholder imagery only — safe to remove once real photos
      // replace it.
      { protocol: "https", hostname: "picsum.photos" },
      // Venue's own site — hotlinked for real hero/venue/event photography.
      { protocol: "https", hostname: "www.bundelkhandriverside.com" },
      // Venue's Google Maps listing photo (the hero shot).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
