"use client";

import { Bot, Check } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import {
  AGENT_MODELS,
  AGENT_SOURCES,
  AGENT_TOOLS,
  type AgentConfiguration,
  type AgentModel,
  type AgentResource,
  type AgentTestRequest,
  DEFAULT_AGENT,
} from "./agent-builder-data";
import { AgentConfigurationPanel } from "./agent-configuration";
import { AgentTestChat } from "./agent-test-chat";

export type AgentBuilderProps = {
  initialConfiguration?: AgentConfiguration;
  models?: readonly AgentModel[];
  sources?: readonly AgentResource[];
  tools?: readonly AgentResource[];
  onSave?: (configuration: AgentConfiguration) => void | Promise<void>;
  onTest?: (request: AgentTestRequest) => Promise<string>;
  demo?: boolean;
  className?: string;
};
export function AgentBuilder({
  initialConfiguration = DEFAULT_AGENT,
  models = AGENT_MODELS,
  sources = AGENT_SOURCES,
  tools = AGENT_TOOLS,
  onSave,
  onTest,
  demo = false,
  className,
}: AgentBuilderProps) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [saved, setSaved] = useState(initialConfiguration);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const dirty = JSON.stringify(configuration) !== JSON.stringify(saved);
  async function save() {
    if (lock.current) return;
    if (!configuration.name.trim() || !configuration.instructions.trim()) {
      setError("Add an agent name and instructions before saving.");
      return;
    }
    if (!models.some((model) => model.id === configuration.model)) {
      setError("Choose an available model.");
      return;
    }
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave?.(configuration);
      setSaved(configuration);
      setNotice(onSave ? "Agent saved." : "Agent saved for this preview.");
    } catch {
      setError("Couldn’t save your agent. Please try again.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return (
    <div
      className={cn(
        "w-full bg-background px-5 py-8 text-foreground sm:px-8",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-muted">
              <Bot size={21} />
            </span>
            <div>
              <h2 className="text-xl font-medium">Agent builder</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Shape how your assistant thinks, responds, and helps.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              disabled={!dirty || saving}
              onClick={() => {
                setConfiguration(saved);
                setNotice("");
                setError("");
              }}
              className="text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
            >
              Reset changes
            </Button>
            <Button
              disabled={saving}
              onClick={() => void save()}
              className="text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
            >
              {saving ? "Saving…" : "Save agent"}
            </Button>
          </div>
        </header>
        <div className="grid items-stretch gap-10 lg:grid-cols-2 lg:gap-14">
          <AgentConfigurationPanel
            value={configuration}
            onChange={(next) => {
              setConfiguration(next);
              setNotice("");
              setError("");
            }}
            models={models}
            sources={sources}
            tools={tools}
            disabled={saving}
          />
          <AgentTestChat
            configuration={configuration}
            onTest={onTest}
            demo={demo}
          />
        </div>
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-muted-foreground">
          <p>
            {dirty
              ? "You have unsaved changes."
              : "Your configuration is up to date."}
          </p>
          <output aria-live="polite" className="flex items-center gap-2">
            {notice && <Check size={14} />} {notice}
          </output>
        </footer>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
