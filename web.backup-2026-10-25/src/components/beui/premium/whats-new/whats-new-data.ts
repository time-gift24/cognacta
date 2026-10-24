import { createElement, type ReactNode } from "react";
import { WhatsNewBoardDemo } from "./whats-new-board-demo";

export type WhatsNewCategoryId = string;

export type WhatsNewCategory = {
  id: WhatsNewCategoryId;
  label: string;
  /** Tinted pill classes (border, background, text) for both themes. */
  pillClassName: string;
};

export type WhatsNewRelease = {
  version: string;
  /** Short release label, e.g. "New in 4.2". */
  label: string;
  /** ISO date of the release. */
  date: string;
  /** One-line teaser headline. Falls back to the first slide title. */
  headline?: string;
};

/** Passed to custom media so it can pause loops while off screen. */
export type WhatsNewMediaContext = {
  active: boolean;
  reduceMotion: boolean;
};

export type WhatsNewImageMedia = { src: string; alt: string };

export type WhatsNewCustomMedia = {
  render: ReactNode | ((context: WhatsNewMediaContext) => ReactNode);
  /** Optional still used in the teaser thumbnail stack. */
  thumbnail?: string;
};

export type WhatsNewSlideMedia = WhatsNewImageMedia | WhatsNewCustomMedia;

export type WhatsNewSlide = {
  id: string;
  category: WhatsNewCategoryId;
  title: string;
  description: string;
  /** Up to three short bullets. */
  highlights?: string[];
  media: WhatsNewSlideMedia;
  cta?: { label: string; href: string };
};

export type WhatsNewTeaserPlacement = "bottom-right" | "bottom-left" | "inline";

export type WhatsNewLabels = {
  teaserCta: string;
  dismissTeaser: string;
  close: string;
  back: string;
  next: string;
  done: string;
  changelog: string;
  highlights: string;
  /** Announced politely whenever the slide changes. */
  slideStatus: (position: number, total: number) => string;
  goToSlide: (position: number, title: string) => string;
  formatDate: (iso: string) => string;
};

export function isImageMedia(
  media: WhatsNewSlideMedia,
): media is WhatsNewImageMedia {
  return "src" in media;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export const DEFAULT_LABELS: WhatsNewLabels = {
  teaserCta: "See what's new",
  dismissTeaser: "Dismiss release announcement",
  close: "Close release notes",
  back: "Back",
  next: "Next",
  done: "Got it",
  changelog: "View full changelog",
  highlights: "Highlights",
  slideStatus: (position, total) => `Slide ${position} of ${total}`,
  goToSlide: (position, title) => `Go to slide ${position}: ${title}`,
  formatDate: (iso) => DATE_FORMAT.format(new Date(iso)),
};

export const DEFAULT_RELEASE: WhatsNewRelease = {
  version: "4.2",
  label: "New in 4.2",
  date: "2026-10-08",
  headline: "Guest boards, self-moving cards, and a new timeline",
};

export const DEFAULT_CATEGORIES: WhatsNewCategory[] = [
  {
    id: "feature",
    label: "New feature",
    pillClassName:
      "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  {
    id: "improvement",
    label: "Improvement",
    pillClassName:
      "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    id: "fix",
    label: "Fix",
    pillClassName:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
];

const ART = "https://pro.beui.dev";

export const DEFAULT_SLIDES: WhatsNewSlide[] = [
  {
    id: "guest-boards",
    category: "feature",
    title: "Share one board with a client",
    description:
      "Invite guests to a single Northwind board without giving them a seat in your workspace.",
    highlights: [
      "Guests only see the boards you share.",
      "Links expire after 30 days unless you extend them.",
      "Every guest edit lands in the board history.",
    ],
    media: {
      src: `${ART}/features/watercolor-valley.webp`,
      alt: "Watercolor valley artwork for guest boards",
    },
    cta: { label: "Share a board", href: "#guest-boards" },
  },
  {
    id: "auto-move",
    category: "feature",
    title: "Cards move when the work does",
    description:
      "Set a rule once and Northwind moves cards to the next column when a review is approved.",
    highlights: [
      "Trigger on approvals, merged branches, or due dates.",
      "Every automatic move is labelled on the card.",
    ],
    media: {
      render: ({ active, reduceMotion }) =>
        createElement(WhatsNewBoardDemo, { active, reduceMotion }),
    },
    cta: { label: "Create a rule", href: "#auto-move" },
  },
  {
    id: "timeline",
    category: "improvement",
    title: "Timeline view, now with dependencies",
    description:
      "Drag a bar to reschedule and everything that depends on it shifts along with it.",
    highlights: [
      "Zoom between weeks, months, and quarters.",
      "Drag a bar's edge to change its length.",
    ],
    media: {
      src: `${ART}/content/journey-sketch.webp`,
      alt: "Pencil sketch of a winding path for the timeline view",
    },
  },
  {
    id: "insights",
    category: "improvement",
    title: "Usage insights on every plan",
    description:
      "Active members, storage, and automation runs in one place, compared week over week.",
    highlights: [
      "Download any chart for your team update.",
      "Spot idle seats before your next renewal.",
    ],
    media: {
      src: `${ART}/content/metrics-isometric.webp`,
      alt: "Isometric illustration of stacked metric blocks",
    },
    cta: { label: "Open insights", href: "#insights" },
  },
];
