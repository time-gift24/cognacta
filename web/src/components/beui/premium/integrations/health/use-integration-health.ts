"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  IntegrationHealthConnection,
  IntegrationHealthRun,
  IntegrationHealthScope,
  IntegrationHealthStatus,
} from "./integration-health-data";
import { SYNC_DURATION_MS } from "./integration-health-motion";

export type IntegrationHealthCallbacks = {
  /** Resolve when the app is reconnected; reject to show the retry state. */
  onReconnect?: (id: string) => Promise<void>;
  onSyncNow?: (id: string) => void | Promise<void>;
  onRequestScope?: (
    id: string,
    scope: IntegrationHealthScope,
  ) => void | Promise<void>;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const defaultReconnect = () => wait(1300);
const MAX_RUNS = 6;

function nextVolume(volume: readonly number[]) {
  const recent = volume.slice(-3);
  const average = recent.reduce((sum, value) => sum + value, 0) / 3;
  return Math.max(12, Math.round(average * 1.12 + 4));
}

export function useIntegrationHealth(
  initial: readonly IntegrationHealthConnection[],
  {
    onReconnect = defaultReconnect,
    onSyncNow,
    onRequestScope,
  }: IntegrationHealthCallbacks,
) {
  const [connections, setConnections] = useState(() =>
    initial.map((connection) => ({ ...connection })),
  );
  const [syncing, setSyncing] = useState<ReadonlySet<string>>(new Set());
  const runCount = useRef(0);

  const update = useCallback(
    (
      id: string,
      fn: (
        connection: IntegrationHealthConnection,
      ) => IntegrationHealthConnection,
    ) =>
      setConnections((list) =>
        list.map((connection) =>
          connection.id === id ? fn(connection) : connection,
        ),
      ),
    [],
  );

  const pushRun = useCallback(
    (
      connection: IntegrationHealthConnection,
      run: Omit<IntegrationHealthRun, "id" | "minutesAgo">,
    ) => {
      runCount.current += 1;
      return [
        { ...run, id: `run-live-${runCount.current}`, minutesAgo: 0 },
        ...connection.runs,
      ].slice(0, MAX_RUNS);
    },
    [],
  );

  const syncNow = useCallback(
    async (id: string) => {
      if (syncing.has(id)) return;
      setSyncing((current) => new Set(current).add(id));
      try {
        await Promise.all([onSyncNow?.(id), wait(SYNC_DURATION_MS)]);
        update(id, (connection) => {
          const records = nextVolume(connection.volume);
          return {
            ...connection,
            lastSyncMinutes: 0,
            volume: [...connection.volume.slice(1), records],
            runs: pushRun(connection, {
              status: "success",
              records: records * 6,
              note: "Manual sync",
            }),
          };
        });
      } catch {
        update(id, (connection) => ({
          ...connection,
          runs: pushRun(connection, {
            status: "failure",
            records: 0,
            note: "Manual sync failed",
          }),
        }));
      } finally {
        setSyncing((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    },
    [onSyncNow, pushRun, syncing, update],
  );

  /** Resolves after the connection is healthy; rejects if reconnect fails. */
  const reconnect = useCallback(
    async (id: string) => {
      await onReconnect(id);
      update(id, (connection) => ({
        ...connection,
        status: "healthy",
        error: undefined,
        lastSyncMinutes: 0,
        scopes: connection.scopes.map((scope) =>
          scope.requested ? { ...scope, granted: true } : scope,
        ),
        runs: pushRun(connection, {
          status: "success",
          records: nextVolume(connection.volume) * 4,
          note: "Reconnected and resumed",
        }),
      }));
    },
    [onReconnect, pushRun, update],
  );

  const requestScope = useCallback(
    async (id: string, scope: IntegrationHealthScope) => {
      await (onRequestScope ? onRequestScope(id, scope) : wait(900));
      update(id, (connection) => ({
        ...connection,
        scopes: connection.scopes.map((item) =>
          item.id === scope.id ? { ...item, requested: true } : item,
        ),
      }));
    },
    [onRequestScope, update],
  );

  const counts = useMemo(() => {
    const result: Record<IntegrationHealthStatus, number> = {
      healthy: 0,
      attention: 0,
      failing: 0,
    };
    for (const connection of connections) result[connection.status] += 1;
    return result;
  }, [connections]);

  return { connections, counts, syncing, syncNow, reconnect, requestScope };
}
