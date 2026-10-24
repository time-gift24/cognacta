"use client";

import { Star } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkline } from "@/components/beui/charts/sparkline";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { CryptoTokenIcon } from "@/components/beui/premium/crypto-wallet/crypto-token-icon";
import { EASE_IN, EASE_OUT, SPRING_BOUNCE, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  type MarketsLabels,
  marketCompact,
  marketPercent,
  marketPrice,
} from "./markets-data";
import type { LiveCoin } from "./use-live-prices";

const changeTone = (value: number) =>
  value >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";

export function MarketsRow({
  coin,
  rank,
  index,
  cascade,
  watched,
  labels,
  onToggleWatch,
  onSelect,
}: {
  coin: LiveCoin;
  rank: number;
  index: number;
  /** Stagger rows only on first view. */
  cascade: boolean;
  watched: boolean;
  labels: MarketsLabels;
  onToggleWatch: () => void;
  onSelect?: () => void;
}) {
  const reduce = useReducedMotion();
  const weekUp = coin.sparkline[coin.sparkline.length - 1] >= coin.sparkline[0];

  return (
    <motion.tr
      layout={reduce ? false : "position"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.35,
          ease: EASE_OUT,
          delay: cascade ? index * 0.03 : 0,
        },
      }}
      exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_IN } }}
      transition={SPRING_LAYOUT}
      className={cn(
        "group border-b border-border last:border-b-0",
        onSelect && "has-[:focus-visible]:bg-muted hover:bg-muted/60",
      )}
    >
      <td className="w-10 py-3 pr-1 pl-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-pressed={watched}
          aria-label={
            watched
              ? labels.removeFromWatchlist(coin.name)
              : labels.addToWatchlist(coin.name)
          }
          onClick={onToggleWatch}
          className="size-8"
        >
          <motion.span
            key={String(watched)}
            initial={reduce || !watched ? false : { scale: 0.4, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={SPRING_BOUNCE}
            className={cn(
              "flex",
              watched ? "text-amber-500" : "text-muted-foreground",
            )}
          >
            <Star className="size-4" fill={watched ? "currentColor" : "none"} />
          </motion.span>
        </Button>
      </td>
      <td className="hidden w-10 py-3 text-sm text-muted-foreground tabular-nums sm:table-cell">
        {rank}
      </td>
      <th scope="row" className="py-3 pr-3 text-left font-normal">
        <div className="relative flex min-w-0 items-center gap-3">
          <CryptoTokenIcon symbol={coin.symbol} className="size-8" />
          <div className="min-w-0">
            {onSelect ? (
              <Button
                type="button"
                variant="plain"
                onClick={onSelect}
                whileHover={undefined}
                whileTap={undefined}
                className="block truncate text-sm font-medium after:absolute after:inset-0"
              >
                {coin.name}
              </Button>
            ) : (
              <span className="block truncate text-sm font-medium">
                {coin.name}
              </span>
            )}
            <span className="block text-xs text-muted-foreground">
              {coin.symbol}
            </span>
          </div>
        </div>
      </th>
      <td className="py-3 pr-3 text-right">
        <span className="relative inline-flex rounded-lg px-1.5 py-0.5 text-sm font-medium tabular-nums">
          <AnimatePresence initial={false}>
            {coin.tick > 0 && !reduce ? (
              <motion.span
                key={coin.tick}
                aria-hidden="true"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: EASE_OUT }}
                className={cn(
                  "absolute inset-0 rounded-lg",
                  coin.direction === "up"
                    ? "bg-emerald-500/15"
                    : "bg-red-500/15",
                )}
              />
            ) : null}
          </AnimatePresence>
          <DigitSwap
            value={marketPrice(coin.price)}
            direction={coin.direction === "down" ? "down" : "up"}
            className="relative"
          />
        </span>
        <span
          className={cn(
            "block pr-1.5 text-xs tabular-nums md:hidden",
            changeTone(coin.change24h),
          )}
        >
          {marketPercent(coin.change24h)}
        </span>
      </td>
      <td
        className={cn(
          "hidden py-3 pr-3 text-right text-sm tabular-nums md:table-cell",
          changeTone(coin.change24h),
        )}
      >
        <DigitSwap value={marketPercent(coin.change24h)} />
      </td>
      <td className="hidden py-3 pr-3 lg:table-cell">
        {coin.categories.includes("stablecoins") ? (
          // Pegged assets read as a calm flat line rather than stretched noise.
          <span
            aria-hidden="true"
            className="ml-auto block h-px w-28 bg-muted-foreground/40"
          />
        ) : (
          <Sparkline
            values={coin.sparkline}
            delay={reduce ? 0 : 0.2 + index * 0.03}
            strokeClassName={weekUp ? "stroke-emerald-500" : "stroke-red-500"}
            className="ml-auto h-8 w-28"
          />
        )}
      </td>
      <td className="hidden py-3 pr-3 text-right text-sm tabular-nums md:table-cell">
        {marketCompact(coin.marketCap)}
      </td>
      <td className="hidden py-3 pr-2 text-right text-sm text-muted-foreground tabular-nums xl:table-cell">
        {marketCompact(coin.volume24h)}
      </td>
    </motion.tr>
  );
}
