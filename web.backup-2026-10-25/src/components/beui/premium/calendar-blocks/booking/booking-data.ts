import { hashString, weekdayIndex } from "./booking-time";

export type BookingHost = {
  name: string;
  role: string;
  company: string;
  avatar: string;
  meetingTitle: string;
  description: string;
  location: string;
  locationDetail?: string;
  /** Time zone the availability is authored in. */
  timeZoneId: string;
};

export type BookingDuration = { id: string; minutes: number; label: string };

export type BookingTimeZone = {
  id: string;
  label: string;
  /** Fixed offset from UTC in minutes, e.g. -240 for GMT-4. */
  offsetMinutes: number;
};

/** Start times (minutes after midnight, host zone) open on a date. */
export type BookingAvailabilityFn = (
  date: string,
  durationMinutes: number,
) => readonly number[];

export type BookingAvailability =
  | BookingAvailabilityFn
  | Readonly<Record<string, readonly number[]>>;

export type BookingSelection = {
  /** Host-zone calendar date, "YYYY-MM-DD". */
  date: string;
  /** Host-zone start, minutes after midnight. */
  startMinutes: number;
  durationMinutes: number;
  /** Zone the viewer picked to read times in. */
  timeZoneId: string;
  startUtc: string;
  endUtc: string;
};

export type BookingDetails = {
  name: string;
  email: string;
  notes: string;
  guests: string[];
};

export type BookingLabels = {
  durationLabel: string;
  previousMonth: string;
  nextMonth: string;
  calendarLabel: string;
  timeZoneLabel: string;
  clockLabel: string;
  openSlots: string;
  noSlots: string;
  noSlotsHint: string;
  pickDay: string;
  confirm: string;
  previousSlot: string;
  dialogTitle: string;
  dialogDescription: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  guestsLabel: string;
  guestsPlaceholder: string;
  addGuest: string;
  removeGuest: string;
  submit: string;
  submitting: string;
  submitted: string;
  submitError: string;
  nameError: string;
  emailError: string;
  guestError: string;
  cancel: string;
  successTitle: string;
  successDescription: string;
  addToCalendar: string;
  google: string;
  outlook: string;
  ics: string;
  reschedule: string;
  done: string;
};

export const DEFAULT_LABELS: BookingLabels = {
  durationLabel: "Meeting length",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  calendarLabel: "Choose a day",
  timeZoneLabel: "Time zone",
  clockLabel: "Clock format",
  openSlots: "open",
  noSlots: "Nothing open this day",
  noSlotsHint: "Try another highlighted day.",
  pickDay: "Pick a highlighted day to see open times.",
  confirm: "Confirm",
  previousSlot: "Current booking",
  dialogTitle: "Confirm your call",
  dialogDescription: "We'll send the invite and video link to your inbox.",
  nameLabel: "Your name",
  namePlaceholder: "Avery Lin",
  emailLabel: "Email",
  emailPlaceholder: "avery@company.com",
  notesLabel: "Anything to cover?",
  notesPlaceholder: "Share context so the call starts in the right place.",
  guestsLabel: "Guests",
  guestsPlaceholder: "Add a guest email",
  addGuest: "Add guest",
  removeGuest: "Remove",
  submit: "Book call",
  submitting: "Booking",
  submitted: "Booked",
  submitError: "Couldn't book that time. Try again.",
  nameError: "Add your name.",
  emailError: "Enter a valid email.",
  guestError: "Enter a valid guest email.",
  cancel: "Cancel",
  successTitle: "You're booked",
  successDescription: "A calendar invite is on its way.",
  addToCalendar: "Add to calendar",
  google: "Google",
  outlook: "Outlook",
  ics: ".ics file",
  reschedule: "Reschedule",
  done: "Done",
};

export const DEFAULT_HOST: BookingHost = {
  name: "Maren Kessler",
  role: "Onboarding lead",
  company: "Tidewell",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&fm=webp&q=80&w=160",
  meetingTitle: "Workspace walkthrough",
  description:
    "A guided tour of your new workspace, tailored to how your team ships.",
  location: "Video call",
  locationDetail: "Link arrives with the invite",
  timeZoneId: "america-new-york",
};

export const DEFAULT_DURATIONS: readonly BookingDuration[] = [
  { id: "15", minutes: 15, label: "15 min" },
  { id: "30", minutes: 30, label: "30 min" },
  { id: "60", minutes: 60, label: "60 min" },
];

// Fixed offsets keep rendering deterministic; swap in live offsets if you need
// daylight-saving accuracy across seasons.
export const DEFAULT_TIME_ZONES: readonly BookingTimeZone[] = [
  {
    id: "america-los-angeles",
    label: "Los Angeles · GMT-7",
    offsetMinutes: -420,
  },
  { id: "america-new-york", label: "New York · GMT-4", offsetMinutes: -240 },
  { id: "europe-london", label: "London · GMT+1", offsetMinutes: 60 },
  { id: "europe-berlin", label: "Berlin · GMT+2", offsetMinutes: 120 },
  { id: "asia-kolkata", label: "Kolkata · GMT+5:30", offsetMinutes: 330 },
  { id: "asia-singapore", label: "Singapore · GMT+8", offsetMinutes: 480 },
  { id: "australia-sydney", label: "Sydney · GMT+11", offsetMinutes: 660 },
];

export const DEFAULT_TODAY = "2026-10-12";

const DAY_START = 9 * 60;
const DAY_END = 17 * 60;

/**
 * Deterministic sample availability: weekdays 9:00–17:00 in the host zone,
 * with a stable pseudo-random set of taken slots and the odd fully booked day.
 */
export const sampleAvailability: BookingAvailabilityFn = (date, minutes) => {
  if (weekdayIndex(date) > 4) return [];
  const seed = hashString(date);
  if (seed % 7 === 0) return [];
  const step = Math.min(minutes, 30);
  const slots: number[] = [];
  for (let start = DAY_START; start + minutes <= DAY_END; start += step) {
    if (start === 12 * 60) continue;
    const taken = hashString(`${date}:${start}`) % 5 < 2;
    if (!taken) slots.push(start);
  }
  return slots;
};

export function resolveSlots(
  availability: BookingAvailability,
  date: string,
  durationMinutes: number,
): readonly number[] {
  return typeof availability === "function"
    ? availability(date, durationMinutes)
    : (availability[date] ?? []);
}
