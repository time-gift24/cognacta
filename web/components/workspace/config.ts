import type { ComponentType } from "react";
import {
  MessageCircle,
  PenTool,
  Bot,
  LayoutGrid,
  Globe2,
  FileText,
} from "@/components/icons";
import type { Mode } from "./types";

export const modeDefs: Array<{
  value: Mode;
  icon: ComponentType<{ className?: string }>;
}> = [
  { value: "chat", icon: MessageCircle },
  { value: "agent", icon: Bot },
  { value: "design", icon: PenTool },
];

export const projectSeeds = [
  { id: "website-launch", key: "websiteLaunch" },
  { id: "product-strategy", key: "productStrategy" },
  { id: "customer-research", key: "customerResearch" },
] as const;

export const recentSeeds = [
  { id: "recent-onboarding", key: "onboarding" },
  { id: "recent-pricing", key: "pricing" },
  { id: "recent-research", key: "research" },
  { id: "recent-launch-brief", key: "launchBrief" },
  { id: "recent-conversion", key: "conversion" },
  { id: "recent-experiments", key: "experiments" },
] as const;

export const starterSeeds = [
  { key: "runs", icon: LayoutGrid },
  { key: "checklist", icon: FileText },
  { key: "workflow", icon: PenTool },
  { key: "incident", icon: Globe2 },
] as const;

export const replyKeys = ["one", "two", "three"] as const;

export const knowledgeSeeds = [
  { id: "brand-voice", key: "brandVoice", url: "" },
  { id: "project-brief", key: "projectBrief", url: "" },
  { id: "design-reference", key: "designReference", url: "https://beui.dev" },
] as const;

export type StarterKey = (typeof starterSeeds)[number]["key"];
export type ReplyKey = (typeof replyKeys)[number];
