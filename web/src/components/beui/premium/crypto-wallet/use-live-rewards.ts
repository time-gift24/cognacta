"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useRef, useState } from "react";
import {
  type CryptoStakePosition,
  type CryptoVault,
  rewardsPerSecond,
} from "./crypto-staking-data";

export type LivePosition = CryptoStakePosition & {
  /** Clock seconds at which `rewards` was measured. */
  anchor: number;
};

/**
 * Seconds since mount, updated once a second while `ref` is on screen so
 * accrued rewards tick up. Starts at 0 on the server and client alike, pauses
 * offscreen (catching up on return), and never ticks with reduced motion.
 */
export function useLiveClock(ref: RefObject<Element | null>) {
  const reduce = useReducedMotion();
  const visible = useInView(ref, { amount: 0.1 });
  const mountedAt = useRef<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (reduce || !visible) return;
    mountedAt.current ??= Date.now();
    const start = mountedAt.current;
    const tick = () => setSeconds((Date.now() - start) / 1000);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reduce, visible]);
  return seconds;
}

export function accruedRewards(
  position: LivePosition,
  vault: CryptoVault | undefined,
  seconds: number,
) {
  if (!vault) return position.rewards;
  const elapsed = Math.max(0, seconds - position.anchor);
  return (
    position.rewards + rewardsPerSecond(position.staked, vault.apy) * elapsed
  );
}

export const toLivePositions = (
  positions: readonly CryptoStakePosition[],
): LivePosition[] => positions.map((position) => ({ ...position, anchor: 0 }));
