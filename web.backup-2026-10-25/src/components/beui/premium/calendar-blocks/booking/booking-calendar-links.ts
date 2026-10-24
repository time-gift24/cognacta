import type { BookingHost, BookingSelection } from "./booking-data";
import { toCalendarStamp } from "./booking-time";

type EventInfo = {
  title: string;
  details: string;
  location: string;
  start: string;
  end: string;
};

function eventInfo(host: BookingHost, selection: BookingSelection): EventInfo {
  return {
    title: `${host.meetingTitle} with ${host.name}`,
    details: `${host.description}\n\n${host.company} · ${host.role}`,
    location: [host.location, host.locationDetail].filter(Boolean).join(" · "),
    start: selection.startUtc,
    end: selection.endUtc,
  };
}

export function googleCalendarUrl(
  host: BookingHost,
  selection: BookingSelection,
) {
  const info = eventInfo(host, selection);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: info.title,
    details: info.details,
    location: info.location,
    dates: `${toCalendarStamp(info.start)}/${toCalendarStamp(info.end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(
  host: BookingHost,
  selection: BookingSelection,
) {
  const info = eventInfo(host, selection);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: info.title,
    body: info.details,
    location: info.location,
    startdt: info.start,
    enddt: info.end,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

const escapeIcs = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, "\\$&");

export function icsDataUrl(host: BookingHost, selection: BookingSelection) {
  const info = eventInfo(host, selection);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//beUI//Appointment booking//EN",
    "BEGIN:VEVENT",
    `UID:${toCalendarStamp(info.start)}-${selection.durationMinutes}@booking`,
    `DTSTAMP:${toCalendarStamp(info.start)}`,
    `DTSTART:${toCalendarStamp(info.start)}`,
    `DTEND:${toCalendarStamp(info.end)}`,
    `SUMMARY:${escapeIcs(info.title)}`,
    `DESCRIPTION:${escapeIcs(info.details)}`,
    `LOCATION:${escapeIcs(info.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
