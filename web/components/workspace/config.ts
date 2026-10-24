import type { ComponentType } from "react";
import {
  MessageCircle,
  PenTool,
  Bot,
  LayoutGrid,
  Globe2,
  Check,
  FileText,
} from "@/components/icons";
import type { Mode, Session } from "./types";
export const modes: Array<{
  label: Mode;
  icon: ComponentType<{ className?: string }>;
}> = [
  { label: "Chat", icon: MessageCircle },
  { label: "Agent", icon: Bot },
  { label: "Design", icon: PenTool },
];

export const projects = [
  { id: "website-launch", title: "Website launch" },
  { id: "product-strategy", title: "Product strategy" },
  { id: "customer-research", title: "Customer research" },
];

const recentThreads = [
  "Rewrite the onboarding flow",
  "Compare pricing models",
  "Summarize research calls",
  "Draft the launch brief",
  "Audit conversion drop-offs",
  "Plan Q4 experiments",
];

export const starters = [
  {
    title: "Portfolio site",
    icon: Globe2,
    prompt:
      "Build a responsive portfolio website with a project gallery, an about section, and a contact form.",
  },
  {
    title: "Analytics dashboard",
    icon: LayoutGrid,
    prompt:
      "Build an analytics dashboard with key metrics, charts, date filters, and a responsive layout.",
  },
  {
    title: "Landing page",
    icon: FileText,
    prompt:
      "Build a product landing page with a hero, features, pricing, and a signup form.",
  },
  {
    title: "Task manager",
    icon: Check,
    prompt:
      "Build a task manager with projects, a kanban board, due dates, and filters.",
  },
];

export const assistantReplies = [
  "I’ve got it. I’d start by clarifying the outcome, then group the work into the smallest useful decisions. Here’s a focused first pass.",
  "There’s a clear thread here. I can turn this into a concise plan, identify the open questions, and draft the first deliverable.",
  "Let’s make this concrete. I’ll separate what we know, what needs a decision, and the next action that moves the work forward.",
];

export const initialSessions: Session[] = [
  ...projects.map((project) => project.title),
  ...recentThreads,
].map((title, index) => ({
  id: title.toLowerCase().replaceAll(" ", "-"),
  title,
  projectId: projects[index]?.id,
  archived: false,
  messages: [
    { id: 1, role: "user", content: title },
    {
      id: 2,
      role: "assistant",
      content:
        "I pulled the relevant context into one place. We can continue from the open decision or revise the direction.",
    },
  ],
}));
