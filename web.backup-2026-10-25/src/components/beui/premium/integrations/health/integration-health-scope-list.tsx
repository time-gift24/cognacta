"use client";

import { Check, CircleDashed } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { type ButtonState, StatefulButton } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type {
  IntegrationHealthLabels,
  IntegrationHealthScope,
} from "./integration-health-data";
import { STATUS_TONES } from "./integration-health-motion";

/** Granted scopes show an emerald check; missing ones offer a request action. */
export function IntegrationHealthScopeList({
  scopes,
  labels,
  onRequest,
}: {
  scopes: readonly IntegrationHealthScope[];
  labels: IntegrationHealthLabels;
  onRequest: (scope: IntegrationHealthScope) => Promise<void>;
}) {
  const reduce = Boolean(useReducedMotion());

  return (
    <ul className="divide-y divide-border/60 rounded-2xl border border-border">
      {scopes.map((scope, index) => (
        <motion.li
          key={scope.id}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduce ? 0 : 0.35,
            ease: EASE_OUT,
            delay: reduce ? 0 : 0.12 + index * 0.045,
          }}
          className="flex items-center gap-3 px-3.5 py-3"
        >
          <span
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full border",
              scope.granted
                ? STATUS_TONES.healthy.pill
                : STATUS_TONES.attention.pill,
            )}
          >
            {scope.granted ? (
              <Check aria-hidden="true" className="size-3.5" />
            ) : (
              <CircleDashed aria-hidden="true" className="size-3.5" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-foreground text-sm">
              {scope.label}
            </span>
            <span className="block truncate text-muted-foreground text-xs">
              {scope.description}
            </span>
          </span>
          {scope.granted ? (
            <span className="text-muted-foreground text-xs">
              {labels.granted}
            </span>
          ) : (
            <ScopeRequestButton
              scope={scope}
              labels={labels}
              onRequest={onRequest}
            />
          )}
        </motion.li>
      ))}
    </ul>
  );
}

function ScopeRequestButton({
  scope,
  labels,
  onRequest,
}: {
  scope: IntegrationHealthScope;
  labels: IntegrationHealthLabels;
  onRequest: (scope: IntegrationHealthScope) => Promise<void>;
}) {
  const [state, setState] = useState<ButtonState>(
    scope.requested ? "success" : "idle",
  );

  async function request() {
    setState("loading");
    try {
      await onRequest(scope);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <StatefulButton
      variant="secondary"
      size="sm"
      state={state}
      disabled={state === "success"}
      onClick={request}
      loadingText={labels.requestingScope}
      successText={labels.requestedScope}
      errorText={labels.retry}
      aria-label={`${labels.requestScope} ${scope.label}`}
      className="h-9 shrink-0 px-3.5 disabled:opacity-100"
    >
      {labels.requestScope}
    </StatefulButton>
  );
}
