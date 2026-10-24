"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import type { ApiKeyEnvironment, ApiKeysLabels } from "./api-keys-data";
import { SECTION_RISE } from "./api-keys-motion";

export type ApiKeysHeaderProps = {
  titleId: string;
  panelId: string;
  title: string;
  description?: string;
  labels: ApiKeysLabels;
  environments: readonly ApiKeyEnvironment[];
  environment: string;
  onEnvironmentChange: (id: string) => void;
  /** Usable (non-revoked) key count per environment id. */
  counts: Record<string, number>;
  onCreate: () => void;
};

export function ApiKeysHeader({
  titleId,
  panelId,
  title,
  description,
  labels,
  environments,
  environment,
  onEnvironmentChange,
  counts,
  onCreate,
}: ApiKeysHeaderProps) {
  return (
    <>
      <motion.div
        variants={SECTION_RISE}
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-xl">
          <h2 id={titleId} className="font-medium text-4xl tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-muted-foreground text-sm sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        <Button onClick={onCreate} className="shrink-0 self-start sm:self-auto">
          <Plus aria-hidden className="size-4" />
          {labels.create}
        </Button>
      </motion.div>

      <motion.div variants={SECTION_RISE} className="mt-8">
        <Tabs value={environment} onValueChange={onEnvironmentChange}>
          <TabsList aria-label={labels.environments}>
            {environments.map((env) => (
              <TabsTrigger
                key={env.id}
                value={env.id}
                id={`${panelId}-${env.id}`}
                aria-controls={panelId}
                className="gap-2"
              >
                {env.label}
                <span
                  aria-live="polite"
                  className="font-mono text-muted-foreground text-xs tabular-nums"
                >
                  <DigitSwap value={counts[env.id] ?? 0} direction="down" />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>
    </>
  );
}
