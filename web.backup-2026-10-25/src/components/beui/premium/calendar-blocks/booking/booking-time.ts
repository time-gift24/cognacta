// Pure date and time helpers for the appointment booking block. Dates travel as
// ISO "YYYY-MM-DD" strings and months as "YYYY-MM" keys, so nothing here reads
// the clock or the runtime time zone and server and client renders match.

export type GridCell =
  | { date: string; inMonth: true }
  | { key: string; inMonth: false };

const pad = (value: number) => String(value).padStart(2, "0");

export function parseISODate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

export function toISODate(year: number, month: number, day: number) {
  const utc = new Date(Date.UTC(year, month - 1, day));
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

export function addDays(date: string, amount: number) {
  const { year, month, day } = parseISODate(date);
  return toISODate(year, month, day + amount);
}

export function monthOf(date: string) {
  return date.slice(0, 7);
}

export function addMonths(month: string, amount: number) {
  const [year, index] = month.split("-").map(Number);
  return toISODate(year, index + amount, 1).slice(0, 7);
}

export function compareMonths(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function daysInMonth(month: string) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index, 0)).getUTCDate();
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: string) {
  const { year, month, day } = parseISODate(date);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/**
 * Monday-first grid padded to six weeks so the calendar keeps one height while
 * months slide past each other.
 */
export function monthGrid(month: string): GridCell[] {
  const first = `${month}-01`;
  const leading = weekdayIndex(first);
  const cells: GridCell[] = Array.from({ length: leading }, (_, index) => ({
    key: `${month}-blank-${index}`,
    inMonth: false,
  }));
  for (let day = 1; day <= daysInMonth(month); day += 1) {
    cells.push({ date: `${month}-${pad(day)}`, inMonth: true });
  }
  while (cells.length < 42) {
    cells.push({ key: `${month}-blank-${cells.length}`, inMonth: false });
  }
  return cells;
}

function utcDate(date: string) {
  const { year, month, day } = parseISODate(date);
  return new Date(Date.UTC(year, month - 1, day));
}

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const longDateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const shortDateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export const formatMonth = (month: string) =>
  monthFormatter.format(utcDate(`${month}-01`));
export const formatLongDate = (date: string) =>
  longDateFormatter.format(utcDate(date));
export const formatShortDate = (date: string) =>
  shortDateFormatter.format(utcDate(date));

/** Formats minutes after midnight as "9:30 AM" or "09:30". */
export function formatTime(minutes: number, hour12: boolean) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  if (!hour12) return `${pad(hours)}:${pad(mins)}`;
  const suffix = hours < 12 ? "AM" : "PM";
  return `${hours % 12 || 12}:${pad(mins)} ${suffix}`;
}

/**
 * Re-expresses a host-zone start time in the viewer's zone. `dayShift` is -1 or
 * +1 when the slot lands on the neighbouring calendar day for the viewer.
 */
export function shiftToZone(
  startMinutes: number,
  hostOffset: number,
  viewerOffset: number,
) {
  const shifted = startMinutes - hostOffset + viewerOffset;
  const dayShift = Math.floor(shifted / 1440);
  return { minutes: shifted - dayShift * 1440, dayShift };
}

/** UTC ISO timestamp for a host-zone date and start time. */
export function toUtcISO(date: string, minutes: number, hostOffset: number) {
  const { year, month, day } = parseISODate(date);
  return new Date(
    Date.UTC(year, month - 1, day, 0, minutes - hostOffset),
  ).toISOString();
}

/** "20261012T143000Z" for calendar deep links and .ics files. */
export function toCalendarStamp(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Small deterministic hash so sample availability is SSR-stable. */
export function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
