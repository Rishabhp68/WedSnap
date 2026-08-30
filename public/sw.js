/**
 * Service worker for Web Push.
 *
 * A service worker is not optional here: mobile browsers removed the plain
 * `new Notification()` constructor, so the only way to raise a notification on
 * a phone is `registration.showNotification()` from inside this file. It also
 * has to exist for the push subscription itself, which is issued per
 * registration rather than per page.
 *
 * Deliberately does no caching. Offline support is a separate concern, and a
 * stale cache serving an old build is a much worse failure than no cache.
 */

self.addEventListener("install", () => {
  // Take over without waiting for existing tabs to close, so a guest who
  // enables notifications doesn't have to fully quit the app first.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A push with no body (or a non-JSON one) still deserves to ring rather
    // than be dropped silently.
  }

  const title = payload.title || "WedSnap";
  const options = {
    body: payload.body || "",
    // The monogram, generated from the wedding record (app/icons/[size]).
    icon: payload.icon || "/icons/192",
    // The badge is masked to a single flat colour by Android, so it has to be
    // a silhouette on transparency — the monogram would come out a solid blob.
    badge: "/icon-badge.png",
    // Makes the phone buzz alongside the sound on Android.
    vibrate: [90, 60, 90],
    // Grouping key: a second photo replaces the first notification instead of
    // stacking, so ten posts in a row don't bury the whole notification tray.
    tag: payload.tag || "wedsnap",
    renotify: true,
    data: { url: payload.url || "/app" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/app";

  // Focus an already-open tab rather than opening a duplicate — tapping a
  // notification should land you in the app you already had running.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
