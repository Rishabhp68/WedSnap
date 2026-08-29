import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/**
 * All wedding/event dates are stored as absolute UTC instants. Display
 * always renders them in the *wedding's* timezone (not the visitor's) —
 * "6:00 PM" should mean 6pm in Delhi for every guest, wherever they're
 * reading from.
 */
export function formatInWeddingTimezone(date: Date, timezone: string, pattern: string): string {
  return formatInTimeZone(date, timezone, pattern);
}

export function formatEventDate(date: Date, timezone: string): string {
  return formatInWeddingTimezone(date, timezone, "EEEE, MMMM d, yyyy");
}

export function formatEventTimeRange(start: Date, end: Date | null | undefined, timezone: string): string {
  const startStr = formatInWeddingTimezone(start, timezone, "h:mm a");
  if (!end) return startStr;
  const endStr = formatInWeddingTimezone(end, timezone, "h:mm a");
  return `${startStr} – ${endStr}`;
}

export function formatFullDateTime(date: Date, timezone: string): string {
  return formatInWeddingTimezone(date, timezone, "EEEE, MMMM d, yyyy 'at' h:mm a zzz");
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Compact "5m" / "3h" / "2d" stamp for chat lists — deliberately *not*
 * timezone-pinned like the event helpers above: a message's age is relative
 * to whoever is reading it, unlike a ceremony's start time.
 *
 * Call this on the server and pass the string down; formatting a relative
 * time during a client render makes the SSR and hydration passes disagree.
 */
export function formatCompactTimestamp(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  return format(date, "d MMM");
}
