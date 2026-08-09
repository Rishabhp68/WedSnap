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
