import { TEAM_PHOTOS, teamPortrait } from "./team-portraits";

export type TeamMember = {
  name: string;
  role: string;
  /** Portrait photo URL, shown as a 4:5 crop. */
  image: string;
  /** Team id from `teams`. Members without one only appear under "All". */
  team?: string;
  /** Short line revealed on hover. */
  bio?: string;
  /** City and country, such as "Lisbon, PT". */
  location?: string;
  /** IANA time zone, used to show the member's local time. */
  timeZone?: string;
  website?: string;
  social?: string;
};

export type TeamGridTeam = { id: string; label: string };

export type TeamGridLabels = {
  all: string;
  filter: string;
  people: (count: number) => string;
  countries: (count: number) => string;
  hiringTitle: string;
  hiringBody: (openRoles: number) => string;
  hiringCta: string;
  localTime: string;
};

export const TEAM_GRID_LABELS: TeamGridLabels = {
  all: "All",
  filter: "Filter by team",
  people: (count) => `${count} ${count === 1 ? "person" : "people"}`,
  countries: (count) => `${count} ${count === 1 ? "country" : "countries"}`,
  hiringTitle: "Your face here",
  hiringBody: (openRoles) =>
    `${openRoles} open ${openRoles === 1 ? "role" : "roles"} across the team. Remote friendly.`,
  hiringCta: "See open roles",
  localTime: "Local time",
};

export const TEAM_GRID_TEAMS: TeamGridTeam[] = [
  { id: "leadership", label: "Leadership" },
  { id: "engineering", label: "Engineering" },
  { id: "design", label: "Design" },
  { id: "product", label: "Product" },
];

const person = (
  photo: keyof typeof TEAM_PHOTOS,
  fields: Omit<TeamMember, "image" | "website" | "social">,
): TeamMember => ({
  ...fields,
  image: teamPortrait(TEAM_PHOTOS[photo], 640, 800),
  website: `#${photo}`,
  social: `#${photo}-social`,
});

export const TEAM_GRID_MEMBERS: TeamMember[] = [
  person("maya", {
    name: "Maya Okafor",
    role: "Founder & CEO",
    team: "leadership",
    bio: "Sets the bar and the roadmap.",
    location: "Lagos, NG",
    timeZone: "Africa/Lagos",
  }),
  person("dev", {
    name: "Dev Sharma",
    role: "Head of Engineering",
    team: "leadership",
    bio: "Owns the registry and runtime.",
    location: "Bengaluru, IN",
    timeZone: "Asia/Kolkata",
  }),
  person("lior", {
    name: "Lior Adler",
    role: "Design Lead",
    team: "design",
    bio: "Tunes every spring by feel.",
    location: "Tel Aviv, IL",
    timeZone: "Asia/Jerusalem",
  }),
  person("ana", {
    name: "Ana Ruiz",
    role: "Developer Advocate",
    team: "product",
    bio: "Writes the docs you copy first.",
    location: "Madrid, ES",
    timeZone: "Europe/Madrid",
  }),
  person("kenji", {
    name: "Kenji Mori",
    role: "Staff Engineer",
    team: "engineering",
    bio: "Ships at 60fps or not at all.",
    location: "Tokyo, JP",
    timeZone: "Asia/Tokyo",
  }),
  person("priya", {
    name: "Priya Nair",
    role: "Product Manager",
    team: "product",
    bio: "Keeps scope honest.",
    location: "London, GB",
    timeZone: "Europe/London",
  }),
  person("sam", {
    name: "Sam Cole",
    role: "Motion Designer",
    team: "design",
    bio: "Storyboards before code.",
    location: "Toronto, CA",
    timeZone: "America/Toronto",
  }),
  person("tariq", {
    name: "Tariq Hassan",
    role: "Infra Engineer",
    team: "engineering",
    bio: "Keeps deploys boring.",
    location: "Toronto, CA",
    timeZone: "America/Toronto",
  }),
];
