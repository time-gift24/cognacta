import type { FaqItem } from "@/components/beui/premium/faq-blocks/faq-data";

export type PricingPageFaqItem = FaqItem;

/** Plan identifier. Comparison rows key their values by these ids. */
export type PricingPagePlanId = string;

export type PricingPageBilling = "monthly" | "annual";

export type PricingPagePlan = {
  id: PricingPagePlanId;
  name: string;
  summary: string;
  /** Price per seat, per month, billed monthly. */
  monthly: number;
  /** Price per seat, per month, billed annually. */
  annual: number;
  /** Largest team the plan supports. */
  maxSeats: number;
  cta: string;
  /** Destination for the plan CTA. Defaults to "#". */
  href?: string;
  highlights: readonly string[];
};

export const PRICING_PAGE_PLANS: readonly PricingPagePlan[] = [
  {
    id: "starter",
    name: "Starter",
    summary: "For small groups getting their first projects organized.",
    monthly: 12,
    annual: 10,
    maxSeats: 10,
    cta: "Start free trial",
    highlights: [
      "Unlimited projects",
      "Shared docs and boards",
      "30 days of version history",
      "Email support",
    ],
  },
  {
    id: "team",
    name: "Team",
    summary: "For growing teams that plan, review, and ship together.",
    monthly: 24,
    annual: 20,
    maxSeats: 60,
    cta: "Start free trial",
    highlights: [
      "Everything in Starter",
      "Guest access and approvals",
      "Workflow automations",
      "Priority support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    summary: "For organizations that need controls across many teams.",
    monthly: 42,
    annual: 35,
    maxSeats: 500,
    cta: "Talk to sales",
    highlights: [
      "Everything in Team",
      "Single sign-on and SCIM",
      "Audit log and data residency",
      "Dedicated success manager",
    ],
  },
];

export type PricingPageCell = boolean | string;

export type PricingPageGroup = {
  title: string;
  rows: readonly {
    label: string;
    values: Record<PricingPagePlanId, PricingPageCell>;
  }[];
};

export const PRICING_PAGE_COMPARISON: readonly PricingPageGroup[] = [
  {
    title: "Workspace",
    rows: [
      {
        label: "Projects",
        values: { starter: "Unlimited", team: "Unlimited", scale: "Unlimited" },
      },
      {
        label: "Version history",
        values: { starter: "30 days", team: "1 year", scale: "Unlimited" },
      },
      {
        label: "File storage",
        values: { starter: "50 GB", team: "1 TB", scale: "Custom" },
      },
    ],
  },
  {
    title: "Collaboration",
    rows: [
      {
        label: "Guest access",
        values: { starter: false, team: true, scale: true },
      },
      {
        label: "Review and approvals",
        values: { starter: false, team: true, scale: true },
      },
      {
        label: "Workflow automations",
        values: {
          starter: "50 / month",
          team: "5,000 / month",
          scale: "Unlimited",
        },
      },
    ],
  },
  {
    title: "Security and support",
    rows: [
      {
        label: "Single sign-on",
        values: { starter: false, team: false, scale: true },
      },
      {
        label: "Audit log",
        values: { starter: false, team: "90 days", scale: "Unlimited" },
      },
      {
        label: "Support",
        values: { starter: "Email", team: "Priority", scale: "Dedicated" },
      },
    ],
  },
];

export const PRICING_PAGE_FAQ: readonly PricingPageFaqItem[] = [
  {
    id: "seats",
    question: "How are seats counted?",
    answer:
      "A seat is anyone who can edit in your workspace. Guests who only view or comment are free on every plan.",
    category: "Billing",
  },
  {
    id: "switch",
    question: "What happens when my team outgrows a plan?",
    answer:
      "We let you know before you reach the limit. Upgrades apply right away, and we prorate the difference for the rest of the billing period.",
    category: "Billing",
  },
  {
    id: "annual",
    question: "How does annual billing work?",
    answer:
      "Annual plans are billed once a year at a lower seat price. You can add seats at any time, and they are prorated to your renewal date.",
    category: "Billing",
  },
  {
    id: "trial",
    question: "Do I need a card to start a trial?",
    answer:
      "No. Trials run for 14 days with every Team feature, and your workspace stays available on Starter if you decide not to upgrade.",
    category: "Getting started",
  },
];

export const PRICING_PAGE_SEATS = { min: 1, max: 150, default: 12 } as const;

export const DEFAULT_LABELS = {
  eyebrow: "Pricing",
  title: "Pay for the team you have today.",
  description:
    "Every plan is priced per editor. Viewers and commenters are always free, and you can change plans whenever your team does.",
  billingAriaLabel: "Billing period",
  monthly: "Monthly",
  annual: "Annual",
  annualBadge: "−17%",
  team: "Team",
  seatsAriaLabel: "Team size",
  editor: "editor",
  editors: "editors",
  recommended: "Recommended",
  priceSuffix: "/ editor / mo",
  billedYearly: "billed yearly",
  billedMonthly: "billed monthly",
  teamFit: "Team fit",
  teamFitCount: (seats: number, maxSeats: number) =>
    `${seats} of ${maxSeats} editors`,
  teamFitLimit: (maxSeats: number) => `Up to ${maxSeats} editors`,
  compareTitle: "Compare every plan",
  compareDescription:
    "The highlighted column follows your team size, or whichever plan you are looking at.",
  compareCaption: "Plan comparison",
  featureColumn: "Feature",
  compareFrom: (price: string) => `from ${price} / editor`,
  compareMobileAriaLabel: "Choose a plan to compare",
  included: "Included",
  notIncluded: "Not included",
  faqTitle: "Billing questions",
  faqDescription: "Straight answers on seats, trials, and switching plans.",
  closingTitle: (maxSeats: number) => `Bringing more than ${maxSeats} people?`,
  closingDescription:
    "We will put together volume pricing, invoicing, and a rollout plan for your organization.",
  closingSecondary: "Read the security overview",
  closingPrimary: "Talk to sales",
};

export type PricingPageLabels = typeof DEFAULT_LABELS;

/** The smallest plan whose seat limit fits the team, else the largest plan. */
export function recommendedPlanFor(
  plans: readonly PricingPagePlan[],
  seats: number,
): PricingPagePlanId {
  return (
    plans.find((plan) => seats <= plan.maxSeats)?.id ?? plans.at(-1)?.id ?? ""
  );
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}
