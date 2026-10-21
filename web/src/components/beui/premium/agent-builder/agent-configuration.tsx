"use client";

import {
  BookOpen,
  Check,
  FileText,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { useId, useState } from "react";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { Select } from "@/components/beui/premium/select/select";
import type {
  AgentConfiguration,
  AgentModel,
  AgentResource,
} from "./agent-builder-data";

const SECTIONS = [
  { id: "instructions", label: "Instructions", icon: FileText },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "tools", label: "Tools", icon: Wrench },
];
export function AgentConfigurationPanel({
  value,
  onChange,
  models,
  sources,
  tools,
  disabled,
}: {
  value: AgentConfiguration;
  onChange: (value: AgentConfiguration) => void;
  models: readonly AgentModel[];
  sources: readonly AgentResource[];
  tools: readonly AgentResource[];
  disabled: boolean;
}) {
  const [tab, setTab] = useState("instructions");
  const id = useId();
  function toggle(
    key: "sourceIds" | "toolIds",
    itemId: string,
    checked: boolean,
  ) {
    onChange({
      ...value,
      [key]: checked
        ? [...value[key], itemId]
        : value[key].filter((item) => item !== itemId),
    });
  }
  return (
    <div className="min-w-0">
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <SlidersHorizontal size={15} />
        Configuration
      </div>
      <fieldset disabled={disabled} className="min-w-0 space-y-5">
        <Input
          label="Agent name"
          value={value.name}
          maxLength={80}
          onChange={(event) => onChange({ ...value, name: event })}
          className="w-full"
        />
        <Input
          label="Short description"
          value={value.description}
          maxLength={160}
          onChange={(event) => onChange({ ...value, description: event })}
          className="w-full"
        />
        <div>
          <p className="text-sm font-medium">Model</p>
          <Select
            label="Agent model"
            value={value.model}
            options={models}
            disabled={disabled}
            onValueChange={(model) => onChange({ ...value, model })}
            portal
            className="mt-2 block w-full"
            buttonClassName="h-10 w-full justify-between bg-background font-normal focus-visible:ring-2 focus-visible:ring-ring"
            optionsClassName="w-[var(--button-width)] max-w-[calc(100vw-1.5rem)] shadow-none"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab} variant="underline">
          <TabsList aria-label="Agent configuration" className="w-full gap-4">
            {SECTIONS.map(({ id: section, label, icon: Icon }, index) => (
              <TabsTrigger
                key={section}
                value={section}
                id={`${id}-${section}`}
                aria-controls={`${id}-panel-${section}`}
                tabIndex={tab === section ? 0 : -1}
                className="gap-2 px-1 text-xs focus-visible:outline-2 focus-visible:outline-ring"
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const next =
                    SECTIONS[
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? SECTIONS.length - 1
                          : (index +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              SECTIONS.length) %
                            SECTIONS.length
                    ];
                  setTab(next.id);
                  document.getElementById(`${id}-${next.id}`)?.focus();
                }}
              >
                <Icon size={14} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="min-h-72">
          <div
            role="tabpanel"
            id={`${id}-panel-instructions`}
            aria-labelledby={`${id}-instructions`}
            hidden={tab !== "instructions"}
          >
            <label className="block text-sm font-medium">
              How should your agent behave?
              <textarea
                value={value.instructions}
                onChange={(event) =>
                  onChange({ ...value, instructions: event.target.value })
                }
                rows={8}
                maxLength={12000}
                className="mt-3 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm font-normal leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <p className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground">
              <span>Define its role, boundaries, and response style.</span>
              <span className="tabular-nums">
                {value.instructions.length.toLocaleString("en-US")}/12,000
              </span>
            </p>
          </div>
          {(["knowledge", "tools"] as const).map((section) => {
            const resources = section === "knowledge" ? sources : tools;
            const selected =
              section === "knowledge" ? value.sourceIds : value.toolIds;
            return (
              <div
                key={section}
                role="tabpanel"
                id={`${id}-panel-${section}`}
                aria-labelledby={`${id}-${section}`}
                hidden={tab !== section}
              >
                <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {section === "knowledge"
                      ? "Choose what your agent knows"
                      : "Choose what your agent can do"}
                  </span>
                  <span>{selected.length} selected</span>
                </div>
                <div className="space-y-1">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center gap-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{resource.name}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {resource.description}
                        </p>
                      </div>
                      <Checkbox
                        checked={selected.includes(resource.id)}
                        disabled={disabled}
                        aria-label={`Enable ${resource.name}`}
                        onCheckedChange={(checked) =>
                          toggle(
                            section === "knowledge" ? "sourceIds" : "toolIds",
                            resource.id,
                            checked,
                          )
                        }
                        className="min-h-11 [&_button]:relative [&_button]:after:absolute [&_button]:after:-inset-3"
                      />
                    </div>
                  ))}
                  {!resources.length && (
                    <p className="py-5 text-sm text-muted-foreground">
                      No {section === "knowledge" ? "sources" : "tools"}{" "}
                      available.
                    </p>
                  )}
                </div>
                {section === "tools" && (
                  <div className="mt-6 flex items-start gap-3 py-3">
                    <Check size={16} className="mt-1 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Ask before taking action
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Require approval for actions that change data.
                      </p>
                    </div>
                    <Checkbox
                      checked={value.requireApproval}
                      disabled={disabled}
                      aria-label="Require approval for actions"
                      onCheckedChange={(requireApproval) =>
                        onChange({ ...value, requireApproval })
                      }
                      className="min-h-11 [&_button]:relative [&_button]:after:absolute [&_button]:after:-inset-3"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
