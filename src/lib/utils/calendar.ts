interface CalendarEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end?: Date | null;
}

function toUtcBasic(date: Date): string {
  // Google Calendar / ICS want "YYYYMMDDTHHMMSSZ".
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildGoogleCalendarUrl({ title, description, location, start, end }: CalendarEventInput): string {
  const endDate = end ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toUtcBasic(start)}/${toUtcBasic(endDate)}`,
    details: description ?? "",
    location: location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsDataUrl({ title, description, location, start, end }: CalendarEventInput): string {
  const endDate = end ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WedSnap//Wedding Invitation//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}`,
    `DTSTAMP:${toUtcBasic(new Date())}`,
    `DTSTART:${toUtcBasic(start)}`,
    `DTEND:${toUtcBasic(endDate)}`,
    `SUMMARY:${title}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, "\\n")}` : "",
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}
