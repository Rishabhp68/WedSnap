/**
 * Foreground alert: sound + vibration for events that arrive while the app is
 * open on screen.
 *
 * This is not redundant with Web Push. Browsers routinely suppress a push
 * notification when the page that would receive it is already focused, so
 * without this the "someone posted" case is silent in exactly the situation a
 * guest is most likely to be holding the phone.
 *
 * The tone is synthesised rather than loaded from a file — two short notes
 * need no asset, no network request, and no decode.
 */

let context: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

/** A soft two-note chime, quiet enough not to startle in a ceremony. */
function playChime() {
  const ctx = getContext();
  if (!ctx) return;

  // Autoplay policy parks the context until a gesture; the app has almost
  // always had one by now, and if not this resolves on the next interaction.
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  for (const [index, frequency] of [880, 1174.7].entries()) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + index * 0.12;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    // Ramped rather than switched: a bare start/stop on a gain node clicks.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.32);
  }
}

export function alertInApp() {
  if (typeof document === "undefined") return;
  // A background tab gets the real push notification instead; making noise
  // from a tab the guest can't see would be startling and unexplained.
  if (document.visibilityState !== "visible") return;

  try {
    playChime();
  } catch {
    // Audio being blocked must not take the vibration with it.
  }

  // Android only — iOS Safari exposes no vibration API at all.
  navigator.vibrate?.([90, 60, 90]);
}
