export type IntegrationCategory =
  | "Developer"
  | "Data"
  | "Communication"
  | "Design"
  | "Payments";

export type IntegrationItem = {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  logoUrl: string;
};

export const DEFAULT_INTEGRATIONS: IntegrationItem[] = [
  {
    id: "github",
    name: "GitHub",
    category: "Developer",
    description: "Connect repositories, issues, pull requests, and releases.",
    logoUrl:
      "/logos/github.svg",
  },
  {
    id: "linear",
    name: "Linear",
    category: "Developer",
    description: "Keep projects and issues synchronized with active workflows.",
    logoUrl: "/logos/linear.svg",
  },
  {
    id: "postgres",
    name: "Postgres",
    category: "Data",
    description: "Query production data through scoped, auditable actions.",
    logoUrl:
      "/logos/postgresql.svg",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "Developer",
    description: "Deploy Workers and observe activity across the edge.",
    logoUrl:
      "/logos/cloudflare.svg",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    description: "Send decisions to the right channel and collect approvals.",
    logoUrl:
      "/logos/slack.svg",
  },
  {
    id: "figma",
    name: "Figma",
    category: "Design",
    description: "Read files, comments, variables, and component metadata.",
    logoUrl:
      "/logos/figma.svg",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Respond to subscription, invoice, and payment events.",
    logoUrl: "/logos/stripe.svg",
  },
];
