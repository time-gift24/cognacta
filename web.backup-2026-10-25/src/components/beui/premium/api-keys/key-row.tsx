"use client";

import { Ban, Check, Copy, RotateCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Sparkline } from "@/components/beui/charts/sparkline";
import { ActionSwapIcon } from "@/components/beui/motion/action-swap";
import {
  Button,
  type ButtonState,
  StatefulButton,
} from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { ApiKey, ApiKeyStatus, ApiKeysLabels } from "./api-keys-data";
import {
  formatCount,
  formatDate,
  formatRelative,
  maskKey,
} from "./api-keys-format";
import { HIGHLIGHT_FADE, ROW_INITIAL, rowTransition } from "./api-keys-motion";
import { ScopePills } from "./scope-pills";
import { STATUS_STYLES, StatusPill } from "./status-pill";
import { useCopy } from "./use-copy";

const TINT = "rgba(16, 185, 129, 0.12)";
const CLEAR = "rgba(16, 185, 129, 0)";

export type KeyRowProps = {
  apiKey: ApiKey;
  status: ApiKeyStatus;
  now: number;
  labels: ApiKeysLabels;
  delay: number;
  highlight: boolean;
  onRotate: (id: string) => Promise<void>;
  onRequestRevoke: (key: ApiKey) => void;
};

export function KeyRow({
  apiKey,
  status,
  now,
  labels,
  delay,
  highlight,
  onRotate,
  onRequestRevoke,
}: KeyRowProps) {
  const reduce = useReducedMotion() ?? false;
  const { copied, copy } = useCopy();
  const [rotateState, setRotateState] = useState<ButtonState>("idle");
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revoked = status === "revoked";
  const statusLabel = labels[status];
  const total = apiKey.requests.reduce((sum, value) => sum + value, 0);

  useEffect(
    () => () => {
      if (reset.current) clearTimeout(reset.current);
    },
    [],
  );

  async function rotate() {
    setRotateState("loading");
    try {
      await onRotate(apiKey.id);
      setRotateState("success");
    } catch {
      setRotateState("error");
    }
    reset.current = setTimeout(() => setRotateState("idle"), 1400);
  }

  return (
    <motion.tr
      layout="position"
      initial={
        reduce
          ? false
          : { ...ROW_INITIAL, backgroundColor: highlight ? TINT : CLEAR }
      }
      animate={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        backgroundColor: CLEAR,
      }}
      transition={{
        ...rowTransition(delay, reduce),
        backgroundColor: reduce
          ? { duration: 0 }
          : { ...HIGHLIGHT_FADE, delay: 0.5 },
      }}
      className="border-border border-b align-middle last:border-b-0"
    >
      <th scope="row" className="py-4 pr-3 pl-5 text-left font-normal">
        <span
          className={cn(
            "relative inline-block max-w-full truncate font-medium transition-colors duration-300",
            revoked && "text-muted-foreground",
          )}
        >
          {apiKey.name}
          <motion.span
            aria-hidden
            initial={false}
            animate={{ scaleX: revoked ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT }}
            className="absolute inset-x-0 top-1/2 h-px origin-left bg-current"
          />
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-muted-foreground text-xs">
          <DigitSwap
            value={maskKey(apiKey)}
            stagger={0.02}
            duration={0.24}
            className="font-mono"
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              copied ? labels.copied : `${labels.copy}, ${apiKey.name}`
            }
            onClick={() => copy(maskKey(apiKey))}
            className="relative size-7 after:absolute after:-inset-1.5"
          >
            <ActionSwapIcon
              value={copied ? "check" : "copy"}
              className="size-3.5"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </ActionSwapIcon>
          </Button>
        </span>
        <StatusPill
          status={status}
          label={statusLabel}
          className="mt-2 sm:hidden"
        />
      </th>
      <td className="hidden px-3 py-4 lg:table-cell">
        <ScopePills scopes={apiKey.scopes} />
      </td>
      <td className="hidden whitespace-nowrap px-3 py-4 text-muted-foreground tabular-nums xl:table-cell">
        {formatDate(apiKey.createdAt)}
      </td>
      <td className="hidden whitespace-nowrap px-3 py-4 md:table-cell">
        <span className="block tabular-nums">
          {formatRelative(apiKey.lastUsedAt, now, labels.never)}
        </span>
        {apiKey.lastRotatedAt ? (
          <span className="mt-0.5 block text-muted-foreground text-xs">
            {labels.rotated}{" "}
            {formatRelative(
              apiKey.lastRotatedAt,
              now,
              labels.never,
            ).toLowerCase()}
          </span>
        ) : null}
      </td>
      <td className="hidden px-3 py-4 sm:table-cell">
        <span className="flex items-center gap-3">
          <Sparkline
            values={apiKey.requests}
            strokeClassName={cn(
              "transition-[stroke] duration-300",
              STATUS_STYLES[status].stroke,
            )}
            delay={delay + 0.15}
            label={`${formatCount(total)} requests in the last 7 days`}
          />
          <span className="font-mono text-muted-foreground text-xs tabular-nums">
            {formatCount(total)}
          </span>
        </span>
      </td>
      <td className="hidden px-3 py-4 sm:table-cell">
        <StatusPill status={status} label={statusLabel} />
      </td>
      <td className="py-4 pr-5 pl-3">
        <span className="flex items-center justify-end gap-1">
          {revoked ? (
            <span className="px-3 text-muted-foreground text-xs">
              {apiKey.revokedAt ? formatDate(apiKey.revokedAt) : null}
            </span>
          ) : (
            <>
              <StatefulButton
                variant="outline"
                size="sm"
                state={rotateState}
                onClick={rotate}
                aria-label={`${labels.rotate} ${apiKey.name}`}
                loadingText={
                  <span className="sr-only sm:not-sr-only">
                    {labels.rotating}
                  </span>
                }
                successText={
                  <span className="sr-only sm:not-sr-only">
                    {labels.rotateDone}
                  </span>
                }
                className="h-9 px-3"
              >
                <RotateCw aria-hidden className="size-3.5" />
                <span className="hidden sm:inline">{labels.rotate}</span>
              </StatefulButton>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${labels.revoke} ${apiKey.name}`}
                onClick={() => onRequestRevoke(apiKey)}
              >
                <Ban aria-hidden className="size-4" />
              </Button>
            </>
          )}
        </span>
      </td>
    </motion.tr>
  );
}
