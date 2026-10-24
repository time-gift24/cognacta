"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CryptoBridgeRequest,
  CryptoBridgeStage,
} from "./crypto-bridge-data";

export type CryptoBridgeHandlers = {
  /** Sign and broadcast on the source chain. Resolve with the hash. */
  onBridge?: (request: CryptoBridgeRequest) => Promise<{ hash: string }>;
  /** Resolves once the source transaction confirms. */
  waitForSource?: (hash: string) => Promise<void>;
  /** Resolves once funds land on the destination chain. */
  waitForArrival?: (hash: string) => Promise<void>;
};

type Transfer = {
  request: CryptoBridgeRequest;
  stage: CryptoBridgeStage;
  hash?: string;
  failed?: boolean;
  /** Timestamps (ms) when each stage began, for the elapsed column. */
  startedAt: Partial<Record<CryptoBridgeStage, number>>;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Deterministic fake hash for demo mode. */
const demoHash = (seed: string) => {
  let value = 0x811c9dc5;
  let hash = "0x";
  for (let index = 0; index < 64; index += 1) {
    value ^= seed.charCodeAt(index % seed.length) + index;
    value = Math.imul(value, 0x01000193) >>> 0;
    hash += (value & 15).toString(16);
  }
  return hash;
};

/**
 * Drives a transfer through sign → sent → relay → received. Without handlers
 * it simulates each stage, compressing the relay to `demoRelayMs`.
 */
export function useBridgeTransfer(
  { onBridge, waitForSource, waitForArrival }: CryptoBridgeHandlers,
  demoRelayMs: number,
) {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const run = useRef(0);
  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  const advance = (token: number, fields: Partial<Transfer>) => {
    if (token !== run.current) return;
    setTransfer((current) =>
      current
        ? {
            ...current,
            ...fields,
            startedAt: fields.stage
              ? { ...current.startedAt, [fields.stage]: Date.now() }
              : current.startedAt,
          }
        : current,
    );
  };

  const start = async (
    request: CryptoBridgeRequest,
    onReceived?: () => void,
  ) => {
    run.current += 1;
    const token = run.current;
    setTransfer({ request, stage: "sign", startedAt: { sign: Date.now() } });
    try {
      const { hash } = onBridge
        ? await onBridge(request)
        : await wait(1200).then(() => ({
            hash: demoHash(`${request.from}${request.to}${request.amountIn}`),
          }));
      advance(token, { stage: "sent", hash });
      await (waitForSource ? waitForSource(hash) : wait(1400));
      advance(token, { stage: "relay" });
      await (waitForArrival ? waitForArrival(hash) : wait(demoRelayMs));
      advance(token, { stage: "received" });
      if (token === run.current) onReceived?.();
    } catch {
      advance(token, { failed: true });
    }
  };

  const reset = () => {
    run.current += 1;
    setTransfer(null);
  };

  return { transfer, start, reset };
}
