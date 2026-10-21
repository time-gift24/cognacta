"use client";

/*
 * Storyboard
 * 1. Enter: the card blur-rises after the agent's message, then its rows
 *    stagger in 50ms apart.
 * 2. Approve: the button spins "Confirm in wallet" while the wallet signs.
 * 3. Submitted: the buttons cross-fade into the step tracker, which fills to
 *    Confirmed and brings in the explorer link.
 * 4. Decline: the details collapse and a Declined chip settles in the header.
 * Reduced motion: opacity only.
 */

import { ArrowLeftRight, Check, Send, ShieldCheck, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import type { ReactNode } from "react";
import { Button, StatefulButton } from "@/components/beui/motion/button";
import { EASE_IN, EASE_OUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CryptoNetworkIcon } from "../crypto-wallet/crypto-token-icon";
import type {
  CryptoAgentAction,
  CryptoAgentActionStatus,
  CryptoAgentLabels,
} from "./crypto-agent-data";
import { CryptoAgentTxSteps } from "./crypto-agent-tx-steps";

const ICONS = { swap: ArrowLeftRight, send: Send, approve: ShieldCheck };

const COLLAPSE: Variants = {
  open: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
  closed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.22, ease: EASE_IN },
  },
};

/** Staggered row entrance for card bodies. */
export const agentRow = (reduce: boolean | null, index: number) => ({
  initial: reduce ? { opacity: 0 } : { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: EASE_OUT, delay: 0.08 + index * 0.05 },
});

export function CryptoAgentActionCard({
  kind,
  network,
  status,
  hash,
  labels,
  headerAside,
  children,
  approveDisabled,
  explorerUrl,
  onApprove,
  onReject,
}: {
  kind: CryptoAgentAction["kind"];
  network: string;
  status: CryptoAgentActionStatus;
  hash?: string;
  labels: CryptoAgentLabels;
  /** Header slot shown while pending, such as a quote timer. */
  headerAside?: ReactNode;
  children: ReactNode;
  approveDisabled?: boolean;
  explorerUrl?: (hash: string) => string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const reduce = useReducedMotion();
  const Icon = ICONS[kind];
  const deciding =
    status === "pending" || status === "signing" || status === "failed";
  const tracking = status === "submitted" || status === "confirmed";
  const chip =
    status === "confirmed"
      ? { label: labels.confirmed, icon: Check, tone: "text-foreground" }
      : status === "rejected"
        ? { label: labels.rejected, icon: X, tone: "text-muted-foreground" }
        : status === "failed"
          ? { label: labels.failed, icon: X, tone: "text-destructive" }
          : null;

  return (
    <motion.div
      initial={
        reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(6px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className={cn(
        "w-full max-w-sm overflow-hidden rounded-3xl border bg-background transition-colors duration-300",
        status === "rejected" ? "border-dashed border-border" : "border-border",
      )}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted">
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {labels.titles[kind]}
          </p>
          <p className="flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
            <CryptoNetworkIcon network={network} className="size-3.5" />
            {network}
          </p>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          {chip ? (
            <motion.span
              key={chip.label}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING_SWAP}
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium",
                chip.tone,
              )}
            >
              <chip.icon
                className="size-3"
                strokeWidth={2.5}
                aria-hidden="true"
              />
              {chip.label}
            </motion.span>
          ) : status === "pending" ? (
            <motion.span key="aside" exit={{ opacity: 0 }}>
              {headerAside}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <motion.div
        initial={false}
        animate={status === "rejected" ? "closed" : "open"}
        variants={COLLAPSE}
        className="overflow-hidden"
      >
        <div className="px-3.5">{children}</div>
        <div className="p-3.5">
          <AnimatePresence mode="wait" initial={false}>
            {deciding ? (
              <motion.div
                key="decide"
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, ease: EASE_IN },
                }}
                className="grid grid-cols-2 gap-2"
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={status === "signing"}
                  onClick={onReject}
                  className="h-9"
                >
                  {labels.reject}
                </Button>
                <StatefulButton
                  type="button"
                  state={status === "signing" ? "loading" : "idle"}
                  loadingText={labels.signing}
                  disabled={approveDisabled}
                  onClick={onApprove}
                  className="h-9"
                >
                  {status === "failed" ? labels.retry : labels.approve}
                </StatefulButton>
              </motion.div>
            ) : tracking ? (
              <motion.div
                key="track"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <CryptoAgentTxSteps
                  step={status === "confirmed" ? 3 : 1}
                  hash={hash}
                  explorerUrl={explorerUrl}
                  labels={labels}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Label and value row used inside card bodies. */
export function AgentDetailRow({
  label,
  children,
  index,
}: {
  label: ReactNode;
  children: ReactNode;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      {...agentRow(reduce, index)}
      className="flex items-center justify-between gap-3 py-1 text-xs"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground tabular-nums">
        {children}
      </span>
    </motion.div>
  );
}
