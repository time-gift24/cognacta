import type { LucideIcon } from "lucide-react";
import { CalendarDays, Route, Ticket, Wallet } from "lucide-react";

/** Built-in phone screens shipped with the block. */
export type AppShowcaseScreenId = "plan" | "route" | "split" | "tickets";

/** Key into the `people` map. */
export type AppShowcasePersonId = string;

export type AppShowcasePerson = { name: string; avatar: string };

export type AppShowcasePeople = Readonly<
  Record<AppShowcasePersonId, AppShowcasePerson>
>;

export type AppShowcaseFeature = {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Built-in screen to show. Defaults to `id` when it names one. */
  screen?: AppShowcaseScreenId;
  /** Activity that pops beside the phone while the feature is shown. */
  notice: { person: AppShowcasePersonId; text: string };
};

export type AppShowcaseDestination = { name: string; image: string };

export type AppShowcasePlanItem = {
  time: string;
  title: string;
  image: string;
};

/** A route stop with its map point in the 250 × 186 route viewBox. */
export type AppShowcaseStop = {
  name: string;
  /** Walking minutes from the previous stop. */
  minutes: number;
  x: number;
  y: number;
};

export type AppShowcaseSplitEntry = {
  person: AppShowcasePersonId;
  share: number;
};

export type AppShowcaseTicket = {
  eyebrow: string;
  title: string;
  seat: string;
  group: string;
  note: string;
  /** Secondary reservation row under the pass. */
  extra: { title: string; time: string; image: string };
};

/** Mesh-gradient colors behind the phone (up to 10). */
export type AppShowcaseShaderColors = readonly string[];

export const APP_SHOWCASE_LABELS = {
  eyebrow: "Mobile app",
  primaryCta: "Download for iPhone",
  secondaryCta: "Get it on Android",
  featuresLabel: "App features",
  screenLabel: "App screen",
  planDay: "Day 2",
  routeEyebrow: "Day 2 route",
  routeTotalSuffix: "min on foot",
  routeStart: "Start",
  routeStepSuffix: "min",
  splitEyebrow: "Shared costs",
  splitTitle: "Weekend by the river",
  splitTotal: "Group total",
  currency: "$",
  ticketsEyebrow: "Saved offline",
  ticketsTitle: "Your passes",
  seat: "Seat",
  group: "Group",
};

export type AppShowcaseLabels = typeof APP_SHOWCASE_LABELS;

const photo = (id: string, size: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&fm=webp&q=80&w=${size}&h=${size}`;

export const APP_SHOWCASE_PEOPLE: AppShowcasePeople = {
  ana: { name: "Ana", avatar: photo("1494790108377-be9c29b29330", 96) },
  jon: { name: "Jon", avatar: photo("1500648767791-00dcc994a43e", 96) },
  rui: { name: "Rui", avatar: photo("1507003211169-0a1dd7228f2d", 96) },
  lea: { name: "Lea", avatar: photo("1438761681033-6461ffad8d80", 96) },
};

export const APP_SHOWCASE_FEATURES: readonly AppShowcaseFeature[] = [
  {
    id: "plan",
    label: "Plan",
    title: "Plan every day",
    description:
      "Drop bookings, notes, and ideas into a day-by-day plan the whole group can edit.",
    icon: CalendarDays,
    notice: { person: "lea", text: "Lea added dinner at 19:00" },
  },
  {
    id: "route",
    label: "Route",
    title: "See the route",
    description:
      "Each day turns into a walkable route with travel times between every stop.",
    icon: Route,
    notice: { person: "rui", text: "Rui moved the museum earlier" },
  },
  {
    id: "split",
    label: "Split",
    title: "Split costs fairly",
    description:
      "Log a purchase once and everyone’s share updates, ready to settle at the end.",
    icon: Wallet,
    notice: { person: "jon", text: "Jon paid $42 for lunch" },
  },
  {
    id: "tickets",
    label: "Tickets",
    title: "Tickets offline",
    description:
      "Passes and reservations stay on your phone, even with no signal at the gate.",
    icon: Ticket,
    notice: { person: "ana", text: "Ana shared 2 museum passes" },
  },
];

export const APP_SHOWCASE_DESTINATION: AppShowcaseDestination = {
  name: "Old town",
  image: photo("1555881400-74d7acaacd8b", 640),
};

/** People stacked on the plan cover. */
export const APP_SHOWCASE_PLAN_MEMBERS: readonly AppShowcasePersonId[] = [
  "ana",
  "jon",
  "lea",
];

export const APP_SHOWCASE_PLAN: readonly AppShowcasePlanItem[] = [
  {
    time: "09:00",
    title: "Market coffee",
    image: photo("1495474472287-4d71bcdd2085", 96),
  },
  {
    time: "10:30",
    title: "Sunset bridge",
    image: photo("1499856871958-5b9627545d1a", 96),
  },
  {
    time: "13:00",
    title: "River lunch",
    image: photo("1504674900247-0877df9cc836", 96),
  },
  {
    time: "15:30",
    title: "Art museum",
    image: photo("1554907984-15263bfd63bd", 96),
  },
  {
    time: "19:00",
    title: "Group dinner",
    image: photo("1414235077428-338989a2e8c0", 96),
  },
];

export const APP_SHOWCASE_STOPS: readonly AppShowcaseStop[] = [
  { name: "Market hall", minutes: 0, x: 36, y: 150 },
  { name: "Old bridge", minutes: 12, x: 92, y: 74 },
  { name: "Riverside", minutes: 9, x: 168, y: 112 },
  { name: "Art museum", minutes: 15, x: 214, y: 36 },
];

export const APP_SHOWCASE_SPLIT: readonly AppShowcaseSplitEntry[] = [
  { person: "ana", share: 142 },
  { person: "jon", share: 118 },
  { person: "rui", share: 96 },
  { person: "lea", share: 131 },
];

export const APP_SHOWCASE_MUSEUM_IMAGE = photo("1554907984-15263bfd63bd", 96);

export const APP_SHOWCASE_TICKET: AppShowcaseTicket = {
  eyebrow: "Flight · Gate B12",
  title: "Boarding 18:40",
  seat: "14A",
  group: "2",
  note: "Works without signal",
  extra: {
    title: "Museum entry",
    time: "15:30",
    image: APP_SHOWCASE_MUSEUM_IMAGE,
  },
};

export const APP_SHOWCASE_SHADER_COLORS: AppShowcaseShaderColors = [
  "#f3d9c2",
  "#9fd6c9",
  "#f0c08f",
  "#b9d3ea",
];

export const APP_SHOWCASE_INTERVAL_MS = 5000;
