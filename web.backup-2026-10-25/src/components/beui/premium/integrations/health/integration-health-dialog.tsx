"use client";

import { PlugZap, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import {
  Button,
  type ButtonState,
  StatefulButton,
} from "@/components/beui/motion/button";
import { IntegrationMark } from "../integration-mark";
import type {
  IntegrationHealthConnection,
  IntegrationHealthLabels,
  IntegrationHealthScope,
} from "./integration-health-data";
import { IntegrationHealthErrorDetail } from "./integration-health-error-detail";
import { IntegrationHealthRunTimeline } from "./integration-health-run-timeline";
import { IntegrationHealthScopeList } from "./integration-health-scope-list";
import { IntegrationHealthStatusPill } from "./integration-health-status-pill";

export type IntegrationHealthDialogProps = {
  connection: IntegrationHealthConnection | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: IntegrationHealthLabels;
  formatSyncAge: (minutes: number) => string;
  onReconnect: (id: string) => Promise<void>;
  onRequestScope: (id: string, scope: IntegrationHealthScope) => Promise<void>;
};

/**
 * Connection detail. Reconnect runs idle → loading → success; on success the
 * header pill pops from failing to healthy, the error block leaves, and the
 * new run slides into the timeline. Counts behind the dialog roll in sync.
 */
export function IntegrationHealthDialog({
  connection,
  open,
  onOpenChange,
  labels,
  formatSyncAge,
  onReconnect,
  onRequestScope,
}: IntegrationHealthDialogProps) {
  const [reconnectState, setReconnectState] = useState<ButtonState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);
  const connectionId = connection?.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset per connection
  useEffect(() => {
    setReconnectState("idle");
    return () => window.clearTimeout(resetTimer.current);
  }, [connectionId]);

  if (!connection) return null;
  const { integration } = connection;
  const healthy = connection.status === "healthy";

  async function reconnect(id: string) {
    window.clearTimeout(resetTimer.current);
    setReconnectState("loading");
    try {
      await onReconnect(id);
      setReconnectState("success");
    } catch {
      setReconnectState("error");
    }
    resetTimer.current = window.setTimeout(
      () => setReconnectState("idle"),
      2200,
    );
  }

  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      backdropClassName="bg-foreground/5 backdrop-blur-xs"
      panelClassName="relative max-w-xl rounded-3xl"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={labels.closeDialog}
        onClick={() => onOpenChange(false)}
        className="absolute top-4 right-4 z-10 bg-muted/70 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </Button>

      <header className="flex items-center gap-3.5 border-border/60 border-b px-5 pt-6 pb-5 pr-16 sm:px-6">
        <IntegrationMark
          integration={integration}
          className="size-12 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AnimatedModalTitle className="truncate font-medium text-foreground text-xl">
              {integration.name}
            </AnimatedModalTitle>
            <IntegrationHealthStatusPill
              status={connection.status}
              label={labels[connection.status]}
            />
          </div>
          <AnimatedModalDescription className="mt-0.5 truncate text-muted-foreground text-sm">
            {connection.account} · {labels.lastSync}{" "}
            {formatSyncAge(connection.lastSyncMinutes).toLowerCase()}
          </AnimatedModalDescription>
        </div>
      </header>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        {connection.error ? (
          <section aria-label={labels.errorTitle}>
            <IntegrationHealthErrorDetail
              error={connection.error}
              labels={labels}
            />
          </section>
        ) : null}

        <section>
          <h3 className="mb-2.5 font-medium text-foreground text-sm">
            {labels.scopesTitle}
          </h3>
          <IntegrationHealthScopeList
            key={connection.id}
            scopes={connection.scopes}
            labels={labels}
            onRequest={(scope) => onRequestScope(connection.id, scope)}
          />
        </section>

        <section>
          <h3 className="mb-1.5 font-medium text-foreground text-sm">
            {labels.runsTitle}
          </h3>
          <IntegrationHealthRunTimeline
            runs={connection.runs}
            labels={labels}
            formatSyncAge={formatSyncAge}
          />
        </section>
      </div>

      <footer className="flex items-center justify-end gap-2 border-border/60 border-t px-5 py-4 sm:px-6">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {labels.close}
        </Button>
        <StatefulButton
          variant={
            healthy && reconnectState === "idle" ? "secondary" : "primary"
          }
          state={reconnectState}
          onClick={() => reconnect(connection.id)}
          loadingText={labels.reconnecting}
          successText={labels.reconnected}
          errorText={labels.retry}
          icon={<PlugZap aria-hidden="true" className="size-4" />}
        >
          {labels.reconnect}
        </StatefulButton>
      </footer>
    </AnimatedModal>
  );
}
