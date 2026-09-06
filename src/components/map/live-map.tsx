"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
// Named imports, not a default: maplibre-gl publishes no default export.
import { LngLatBounds, MapLibreMap, Marker, Popup, setWorkerUrl } from "maplibre-gl";
import Link from "next/link";
import { Crosshair, MapPin, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchField } from "@/components/shared/search-field";
import { getPusherClient } from "@/lib/realtime/pusher-client";
import { locationChannel, LOCATION_EVENTS } from "@/lib/realtime/channels";
import { updateLocationAction } from "@/lib/actions/location";
import type { SharedLocation } from "@/lib/data/location";

interface MapGuest {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface LiveMapProps {
  weddingId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl: string | null;
  guests: MapGuest[];
  initialLocations: SharedLocation[];
  sharingEnabled: boolean;
  center: { lat: number; lng: number };
}

// Server-side sync is throttled independently of watchPosition's own callback
// rate, which can fire every few seconds on a moving device. The local pin
// still moves on every callback — only the network write is rate-limited.
const MIN_SYNC_INTERVAL_MS = 10_000;

/**
 * Vector tiles, not raster. Raster basemaps ship one bitmap per tile at 1×, so
 * on a phone at 2–3× device pixel ratio every tile pixel is stretched across
 * several screen pixels — which is why the old OSM basemap looked pixelated on
 * mobile. Vector tiles carry geometry and are drawn on the GPU at the device's
 * true resolution, so roads and labels stay sharp at any zoom.
 *
 * OpenFreeMap serves the OpenMapTiles schema with no API key and no signup,
 * which is what makes it usable here — CARTO's key-less endpoint now watermarks
 * every tile, and the other hosted styles all require an account.
 */
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

/**
 * MapLibre 6 loads its worker from a URL it builds at runtime relative to its
 * own module. Bundled into a Next chunk that resolves to a file that was never
 * emitted, so the request 404s — and since all tile parsing happens in the
 * worker, the map paints its background colour and nothing else. Pointing it
 * at our own copy (kept in sync by scripts/copy-maplibre-worker.mjs) avoids
 * the resolution entirely.
 *
 * Note the extension: `.mjs` had to be added to the middleware matcher in
 * proxy.ts, or this request is redirected to sign-in and the map stays blank.
 */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/**
 * Positron is a neutral grey basemap. Rather than wash the whole canvas with a
 * CSS filter — which would tint the labels and shadows too — recolour the few
 * fill layers that carry the map's character onto the wedding palette. Each is
 * guarded, so an upstream change to the style can drop a layer without
 * throwing and taking the map down with it.
 */
const PALETTE: Record<string, string> = {
  background: "#fbf6ec",
  landuse_residential: "#f6efe3",
  park: "#e9eee0",
  landcover_wood: "#e2e9d9",
  building: "#f0e6d6",
  water: "#cdd9e0",
  road_area_pier: "#fbf6ec",
};

function applyPalette(map: MapLibreMap) {
  for (const [id, color] of Object.entries(PALETTE)) {
    const layer = map.getLayer(id);
    if (!layer) continue;
    const property = layer.type === "background" ? "background-color" : "fill-color";
    try {
      map.setPaintProperty(id, property, color);
    } catch {
      // A layer that exists but isn't a fill simply keeps its own colour.
    }
  }
}

function createPinElement() {
  const root = document.createElement("div");
  const body = document.createElement("div");
  body.className = "guest-pin__body";
  const tail = document.createElement("div");
  tail.className = "guest-pin__tail";
  root.append(body, tail);
  return root;
}

/**
 * Builds the pin content as real nodes rather than an HTML string — Leaflet's
 * divIcon only accepted markup, which meant hand-escaping guest names. Here a
 * name is set as text and can't be markup in the first place.
 */
function renderPin(root: HTMLElement, location: SharedLocation, isSelf: boolean) {
  root.className = `guest-pin${isSelf ? " guest-pin--self" : ""}`;
  const body = root.firstElementChild as HTMLElement;
  const avatar = location.avatarUrl ?? "";

  // Keyed on the URL so a moving pin re-positions without swapping the <img>
  // out from under the browser, which would make the avatar flicker on every
  // geolocation callback.
  if (root.dataset.avatar === avatar) {
    if (!avatar) body.textContent = location.name.slice(0, 1).toUpperCase();
    return;
  }
  root.dataset.avatar = avatar;

  if (avatar) {
    const img = document.createElement("img");
    img.src = avatar;
    img.alt = "";
    body.replaceChildren(img);
  } else {
    body.textContent = location.name.slice(0, 1).toUpperCase();
  }
}

export function LiveMap({
  weddingId,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  guests,
  initialLocations,
  sharingEnabled,
  center,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  // Captured once: later prop changes must not tear the map down and rebuild it.
  const initialCenter = useRef(center);
  const lastSyncedAt = useRef(0);

  const [mapReady, setMapReady] = useState(false);
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<Record<string, SharedLocation>>(() =>
    Object.fromEntries(initialLocations.map((location) => [location.userId, location])),
  );
  const [geoError, setGeoError] = useState<string | null>(null);

  // MapLibre draws through WebGL 2 and throws on construction without it.
  // Checking before the map is ever built means the unsupported case renders
  // a message on the first paint, rather than mounting and then erroring.
  const [mapError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const probe = document.createElement("canvas").getContext("webgl2");
      if (probe) return null;
    } catch {
      // Some privacy modes throw rather than returning null.
    }
    return "This browser can't display the map.";
  });

  // Evaluated once in the browser (this component never server-renders), so
  // the "why is my location not working" case is answered up front rather
  // than only after watchPosition fails.
  const [unsupportedReason] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    if (!window.isSecureContext) {
      return "Your browser only shares location over a secure connection. Open the app over https (or localhost).";
    }
    if (!navigator.geolocation) return "This browser can't share your location.";
    return null;
  });

  useEffect(() => {
    if (!containerRef.current || mapError) return;

    const markers = markersRef.current;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [initialCenter.current.lng, initialCenter.current.lat],
      zoom: 15,
      // A tilted or rotated map is disorienting for finding people, and on a
      // phone both are easy to trigger by accident while pinching to zoom.
      dragRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
    });

    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    map.on("load", () => {
      applyPalette(map);
      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      markers.clear();
      mapRef.current = null;
      map.remove();
    };
  }, [mapError]);

  // The map measures its container on creation. Inside this flex layout the
  // final height often lands a frame later, which leaves the canvas sized to
  // the wrong box until it's told to re-measure.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => mapRef.current?.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const client = getPusherClient();
    const channelName = locationChannel(weddingId);
    const channel = client.subscribe(channelName);

    channel.bind(LOCATION_EVENTS.LOCATION_UPDATED, (data: SharedLocation) => {
      setLocations((prev) => ({ ...prev, [data.userId]: data }));
    });
    channel.bind(LOCATION_EVENTS.SHARING_STOPPED, (data: { userId: string }) => {
      setLocations((prev) => {
        if (!(data.userId in prev)) return prev;
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(channelName);
    };
  }, [weddingId]);

  useEffect(() => {
    if (!sharingEnabled || unsupportedReason) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGeoError(null);

        // Drop the pin locally right away — waiting on the server round trip
        // plus the Pusher echo makes the map feel broken on first open.
        setLocations((prev) => ({
          ...prev,
          [currentUserId]: {
            userId: currentUserId,
            name: currentUserName,
            avatarUrl: currentUserAvatarUrl,
            latitude,
            longitude,
            updatedAt: new Date().toISOString(),
          },
        }));

        const now = Date.now();
        if (now - lastSyncedAt.current < MIN_SYNC_INTERVAL_MS) return;
        lastSyncedAt.current = now;
        void updateLocationAction(latitude, longitude);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError(
            "Location is blocked for this site. Allow it in your browser's site settings, then reopen the map.",
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError("Your device couldn't get a location fix. Check that location services are on.");
        } else {
          setGeoError("Still trying to get your location...");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharingEnabled, unsupportedReason, currentUserId, currentUserName, currentUserAvatarUrl]);

  const pins = useMemo(() => Object.values(locations), [locations]);
  const self = locations[currentUserId];

  // Markers are imperative objects rather than React children, so this
  // reconciles them by hand: move the ones that already exist, add the new,
  // and drop anyone who stopped sharing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const markers = markersRef.current;
    const present = new Set<string>();

    for (const location of pins) {
      present.add(location.userId);
      const isSelf = location.userId === currentUserId;
      const label = isSelf ? "You" : location.name;
      const existing = markers.get(location.userId);

      if (existing) {
        existing.setLngLat([location.longitude, location.latitude]);
        renderPin(existing.getElement(), location, isSelf);
        existing.getPopup()?.setText(label);
        continue;
      }

      const element = createPinElement();
      renderPin(element, location, isSelf);
      markers.set(
        location.userId,
        new Marker({ element, anchor: "bottom" })
          .setLngLat([location.longitude, location.latitude])
          .setPopup(new Popup({ offset: 14, closeButton: false }).setText(label))
          .addTo(map),
      );
    }

    for (const [userId, marker] of markers) {
      if (present.has(userId)) continue;
      marker.remove();
      markers.delete(userId);
    }
  }, [pins, mapReady, currentUserId]);

  const recenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (self) {
      map.flyTo({ center: [self.longitude, self.latitude], zoom: 16, duration: 600 });
      return;
    }
    if (pins.length > 0) {
      const bounds = pins.reduce(
        (acc, pin) => acc.extend([pin.longitude, pin.latitude]),
        new LngLatBounds(),
      );
      map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 600 });
    }
  }, [self, pins]);

  // Searches the whole guest roster, not just who's currently on the map, so
  // "where is X" gets an answer either way — either a pin to fly to, or an
  // explicit "not sharing" instead of an empty result the guest can't read.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const roster: MapGuest[] = [
      { id: currentUserId, name: currentUserName, avatarUrl: currentUserAvatarUrl },
      ...guests,
    ];
    return roster
      .filter((guest) => guest.name.toLowerCase().includes(q))
      .map((guest) => ({ ...guest, location: locations[guest.id] ?? null }))
      .sort((a, b) => Number(Boolean(b.location)) - Number(Boolean(a.location)));
  }, [query, guests, locations, currentUserId, currentUserName, currentUserAvatarUrl]);

  const flyToGuest = useCallback((location: SharedLocation) => {
    mapRef.current?.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 17,
      duration: 700,
    });
    setQuery("");
  }, []);

  const notice = unsupportedReason ?? geoError;
  const searching = query.trim().length > 0;

  return (
    // `isolate` contains both the map's canvas/controls and the overlay chrome
    // below in one stacking context, so none of it can paint over the app's
    // fixed bottom nav (z-40).
    <div className="relative isolate size-full">
      <div ref={containerRef} className="size-full" />

      {mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted px-8 text-center">
          <p className="text-sm text-muted-foreground">{mapError}</p>
        </div>
      ) : null}

      {/* Anchored to the top so it never covers the attribution control, which
          the OpenStreetMap/OpenMapTiles terms require to stay visible. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <SearchField
            value={query}
            onValueChange={setQuery}
            placeholder="Search guests"
            aria-label="Search guests on the map"
            className="pointer-events-auto flex-1 bg-card/95 shadow-sm backdrop-blur-sm"
          />

          <button
            type="button"
            onClick={recenter}
            disabled={pins.length === 0}
            className="pointer-events-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted disabled:opacity-40"
            aria-label="Recenter map"
          >
            <Crosshair className="size-4" />
          </button>
        </div>

        {searching ? (
          <div className="no-scrollbar pointer-events-auto max-h-64 overflow-y-auto rounded-2xl border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur-sm">
            {searchResults.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No guests found.</p>
            ) : (
              searchResults.map((guest) => (
                <button
                  key={guest.id}
                  type="button"
                  disabled={!guest.location}
                  onClick={() => guest.location && flyToGuest(guest.location)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={guest.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">{guest.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {guest.id === currentUserId ? `${guest.name} (You)` : guest.name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {guest.location ? "On the map" : "Not sharing location"}
                    </span>
                  </span>
                  {guest.location ? (
                    <MapPin className="size-3.5 shrink-0 text-accent-foreground/70" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <span className="pointer-events-auto inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
              <Users className="size-3.5 text-accent-foreground/70" />
              {pins.length === 0
                ? "No one sharing yet"
                : `${pins.length} ${pins.length === 1 ? "guest" : "guests"} sharing`}
            </span>

            {(!sharingEnabled || notice) && (
              <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-card/95 p-3.5 shadow-lg backdrop-blur-sm">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/60 text-accent-foreground">
                  <MapPin className="size-4" />
                </span>
                {!sharingEnabled ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    You&apos;re not on the map. Turn on{" "}
                    <Link href="/app/profile" className="font-medium text-primary underline underline-offset-2">
                      location sharing
                    </Link>{" "}
                    to let other guests find you.
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">{notice}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
