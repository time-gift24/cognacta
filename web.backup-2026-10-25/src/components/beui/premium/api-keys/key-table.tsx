"use client";

import { useState } from "react";
import type { ApiKey, ApiKeyStatus, ApiKeysLabels } from "./api-keys-data";
import { ROW_STAGGER } from "./api-keys-motion";
import { KeyRow } from "./key-row";

export type KeyTableProps = {
  keys: readonly ApiKey[];
  statusOf: (key: ApiKey) => ApiKeyStatus;
  now: number;
  labels: ApiKeysLabels;
  highlightId: string | null;
  onRotate: (id: string) => Promise<void>;
  onRequestRevoke: (key: ApiKey) => void;
};

const HEAD = "px-3 py-3 font-normal";

/**
 * Rows present on mount cascade in; rows added later (a new key) enter on
 * their own, so creating a key never replays the whole list.
 */
export function KeyTable({
  keys,
  statusOf,
  now,
  labels,
  highlightId,
  onRotate,
  onRequestRevoke,
}: KeyTableProps) {
  const [mounted] = useState(() => keys.map((key) => key.id));

  return (
    <div className="overflow-hidden rounded-3xl border border-border">
      <table className="w-full table-auto text-left text-sm">
        <caption className="sr-only">{labels.tableCaption}</caption>
        <thead className="border-border border-b text-muted-foreground text-xs">
          <tr>
            <th scope="col" className="py-3 pr-3 pl-5 font-normal">
              {labels.name}
            </th>
            <th scope="col" className={`${HEAD} hidden lg:table-cell`}>
              {labels.scopes}
            </th>
            <th scope="col" className={`${HEAD} hidden xl:table-cell`}>
              {labels.created}
            </th>
            <th scope="col" className={`${HEAD} hidden md:table-cell`}>
              {labels.lastUsed}
            </th>
            <th scope="col" className={`${HEAD} hidden sm:table-cell`}>
              {labels.requests}
            </th>
            <th scope="col" className={`${HEAD} hidden sm:table-cell`}>
              {labels.status}
            </th>
            <th scope="col" className="py-3 pr-5 pl-3 text-right font-normal">
              <span className="sr-only">{labels.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const index = mounted.indexOf(key.id);
            return (
              <KeyRow
                key={key.id}
                apiKey={key}
                status={statusOf(key)}
                now={now}
                labels={labels}
                delay={index === -1 ? 0 : index * ROW_STAGGER}
                highlight={key.id === highlightId}
                onRotate={onRotate}
                onRequestRevoke={onRequestRevoke}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
