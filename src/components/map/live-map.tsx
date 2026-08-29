"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
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

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string,
  );
}

function guestPinIcon(location: SharedLocation, isSelf: boolean) {
  const inner = location.avatarUrl
    ? `<img src="${escapeHtml(location.avatarUrl)}" alt="" />`
    : escapeHtml(location.name.slice(0, 1).toUpperCase());

  return L.divIcon({
    className: "",
    html: `<div class="guest-pin${isSelf ? " guest-pin--self" : ""}">
             <div class="guest-pin__body">${inner}</div>
             <div class="guest-pin__tail"></div>
           </div>`,
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -50],
  });
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
  const [map, setMap] = useState<L.Map | null>(null);
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<Record<string, SharedLocation>>(() =>
    Object.fromEntries(initialLocations.map((location) => [location.userId, location])),
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const lastSyncedAt = useRef(0);

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

  // Leaflet measures its container on mount. Inside this flex layout the
  // final height often lands a frame later, which leaves the map showing
  // grey/half-loaded tiles until it's told to re-measure.
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    map.invalidateSize();
    return () => observer.disconnect();
  }, [map]);

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

  const recenter = useCallback(() => {
    if (!map) return;
    if (self) {
      map.flyTo([self.latitude, self.longitude], 16, { duration: 0.6 });
      return;
    }
    if (pins.length > 0) {
      map.fitBounds(L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number])), {
        padding: [64, 64],
        maxZoom: 16,
      });
    }
  }, [map, self, pins]);

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

  const flyToGuest = useCallback(
    (location: SharedLocation) => {
      if (!map) return;
      map.flyTo([location.latitude, location.longitude], 17, { duration: 0.7 });
      setQuery("");
    },
    [map],
  );

  const notice = unsupportedReason ?? geoError;
  const searching = query.trim().length > 0;

  return (
    // `isolate` contains both Leaflet's panes and the overlay chrome below in
    // one stacking context, so none of it can paint over the app's fixed
    // bottom nav (z-40) the way Leaflet's own z-index-1000 controls would.
    <div className="relative isolate size-full">
      <MapContainer
        ref={setMap}
        center={[center.lat, center.lng]}
        zoom={15}
        zoomControl={false}
        scrollWheelZoom
        className="size-full"
      >
        {/* CARTO Positron — a minimal, low-chroma basemap. Raw OSM tiles are
            heavily coloured and fight the app's ivory/wine/gold palette. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        {pins.map((location) => (
          <Marker
            key={location.userId}
            position={[location.latitude, location.longitude]}
            icon={guestPinIcon(location, location.userId === currentUserId)}
          >
            <Popup>{location.userId === currentUserId ? "You" : location.name}</Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Anchored to the top so it never covers Leaflet's attribution, which
          the OSM/CARTO tile terms require to stay visible. */}
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
          <div className="pointer-events-auto max-h-64 overflow-y-auto rounded-2xl border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur-sm">
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
