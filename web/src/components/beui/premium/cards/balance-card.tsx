"use client";

import { ArrowUpFromLine, Repeat2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/beui/motion/button/base";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { SPRING_PANEL } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type BalanceCardAsset = {
  label: string;
  icon: ReactNode;
  surfaceClassName?: string;
};

export type BalanceCardProps = {
  label?: string;
  value?: number;
  currency?: string;
  locale?: string;
  change?: string;
  assets?: BalanceCardAsset[];
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
};

const DEFAULT_ASSETS: BalanceCardAsset[] = [
  {
    label: "Bitcoin",
    icon: (
      // biome-ignore lint/performance/noImgElement: official lightweight brand mark.
      <img
        src="https://cdn.simpleicons.org/bitcoin/F7931A"
        alt=""
        aria-hidden
      />
    ),
    surfaceClassName: "bg-[oklch(0.96_0.04_75)]",
  },
  {
    label: "Ethereum",
    icon: (
      // biome-ignore lint/performance/noImgElement: official lightweight brand mark.
      <img
        src="https://cdn.simpleicons.org/ethereum/627EEA"
        alt=""
        aria-hidden
      />
    ),
    surfaceClassName: "bg-[oklch(0.95_0.035_265)]",
  },
  {
    label: "Solana",
    icon: (
      // biome-ignore lint/performance/noImgElement: official lightweight brand mark.
      <img src="https://cdn.simpleicons.org/solana/14F195" alt="" aria-hidden />
    ),
    surfaceClassName: "bg-[oklch(0.95_0.04_155)]",
  },
  {
    label: "Tether",
    icon: (
      // biome-ignore lint/performance/noImgElement: official lightweight brand mark.
      <img src="https://cdn.simpleicons.org/tether/26A17B" alt="" aria-hidden />
    ),
    surfaceClassName: "bg-[oklch(0.95_0.04_165)]",
  },
];

export function BalanceCard({
  label = "Total balance",
  value = 12_000,
  currency = "USD",
  locale = "en-US",
  change = "+ $45.32 today",
  assets = DEFAULT_ASSETS,
  primaryActionLabel = "Move",
  secondaryActionLabel = "Send",
  onPrimaryAction,
  onSecondaryAction,
  className,
}: BalanceCardProps) {
  const reduceMotion = useReducedMotion();
  const canHover = useHoverCapable();

  return (
    <motion.article
      className={cn(
        "w-full max-w-[20.5rem] overflow-hidden rounded-3xl bg-background p-1.5 text-foreground",
        className,
      )}
    >
      <div className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-3xl border border-border bg-background px-6 py-7 text-center text-foreground">
        <ul className="flex -space-x-2" aria-label="Included accounts">
          {assets.slice(0, 4).map((asset) => (
            <motion.li
              key={asset.label}
              title={asset.label}
              whileHover={
                reduceMotion || !canHover ? undefined : { y: -5, zIndex: 10 }
              }
              transition={SPRING_PANEL}
              className={cn(
                "grid size-10 place-items-center rounded-full border-2 border-background [&_img]:size-[1.125rem] [&_img]:object-contain [&_svg]:size-[1.125rem]",
                asset.surfaceClassName ?? "bg-background",
              )}
            >
              <span className="sr-only">{asset.label}</span>
              {asset.icon}
            </motion.li>
          ))}
        </ul>

        <p className="mt-4 font-medium text-xs uppercase tracking-[0.18em] opacity-70">
          {label}
        </p>
        <NumberTicker
          value={value}
          format={(amount) =>
            new Intl.NumberFormat(locale, {
              style: "currency",
              currency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(amount)
          }
          duration={0.8}
          stagger={0.035}
          blur
          className="mt-1 whitespace-nowrap font-semibold text-4xl leading-none tracking-[-0.05em]"
        />
        <p className="mt-3 font-medium text-success text-xs tabular-nums">
          {change}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-1.5 py-2.5">
        <Button
          variant="ghost"
          size="lg"
          onClick={onPrimaryAction}
          className="px-3 text-sm text-foreground hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
        >
          <Repeat2 aria-hidden className="size-[1.125rem]" />
          {primaryActionLabel}
        </Button>

        <span aria-hidden className="h-8 w-px bg-border" />

        <Button
          variant="ghost"
          size="lg"
          onClick={onSecondaryAction}
          className="px-3 text-sm text-foreground hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
        >
          <ArrowUpFromLine aria-hidden className="size-[1.125rem]" />
          {secondaryActionLabel}
        </Button>
      </div>
    </motion.article>
  );
}
