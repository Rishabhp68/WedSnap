"use client";

import dynamic from "next/dynamic";
import type { SharedLocation } from "@/lib/data/location";

// Leaflet touches `window` at import time, so it can only ever run in the
// browser — per the Next.js docs, `ssr: false` is only valid from inside a
// Client Component, hence this thin wrapper around the server page below.
const LiveMap = dynamic(() => import("./live-map").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
});

interface MapPageClientProps {
  weddingId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl: string | null;
  guests: { id: string; name: string; avatarUrl: string | null }[];
  initialLocations: SharedLocation[];
  sharingEnabled: boolean;
  center: { lat: number; lng: number };
}

export function MapPageClient(props: MapPageClientProps) {
  return <LiveMap {...props} />;
}
