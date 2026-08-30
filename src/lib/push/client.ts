/**
 * Browser half of Web Push. Kept out of the component so the notifications
 * toggle and the auto-prompt banner share exactly one implementation.
 */

export const SERVICE_WORKER_URL = "/sw.js";

/**
 * A VAPID key travels as base64url but `applicationServerKey` wants raw bytes,
 * and `atob` only understands standard base64 — hence the character swap and
 * the padding, both of which are silently wrong if omitted.
 */
function urlBase64ToUint8Array(base64: string) {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * True when the page is running as an installed app rather than a browser tab.
 * iOS refuses push entirely outside this mode, so the UI has to be able to say
 * "add to Home Screen first" instead of showing a toggle that cannot work.
 */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own non-standard flag, which is the only signal on iOS.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports as a Mac; the touch points give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export async function registerServiceWorker() {
  if (!pushSupported()) return null;
  return navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });
}

export async function getExistingSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export interface SerialisedSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Flattens the browser's PushSubscription into the shape the server stores. */
export function serialiseSubscription(
  subscription: PushSubscription,
): SerialisedSubscription | null {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return { endpoint: json.endpoint, p256dh, auth };
}

export type SubscribeFailure =
  | "unsupported"
  | "ios-needs-install"
  | "denied"
  | "misconfigured"
  | "failed";

export async function subscribeToPush(
  publicKey: string | undefined,
): Promise<{ ok: true; subscription: SerialisedSubscription } | { ok: false; reason: SubscribeFailure }> {
  if (!pushSupported()) {
    return { ok: false, reason: isIos() && !isStandalone() ? "ios-needs-install" : "unsupported" };
  }
  if (!publicKey) return { ok: false, reason: "misconfigured" };

  // Asking before the browser has decided is the only moment the prompt can
  // appear; once denied it never shows again and must be undone in settings.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });
    // `register` resolves before the worker is usable; subscribing against a
    // still-installing registration throws.
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      // Required to be true by every browser that ships push: a subscription
      // that could deliver silently is not permitted.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const serialised = serialiseSubscription(subscription);
    return serialised ? { ok: true, subscription: serialised } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
