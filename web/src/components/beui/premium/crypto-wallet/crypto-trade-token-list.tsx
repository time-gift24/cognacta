"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CryptoTokenIcon } from "./crypto-token-icon";
import {
  type CryptoTradeToken,
  tradeAmount,
  tradePrice,
  tradeUsd,
} from "./crypto-trade-data";

/** Bolds the first case-insensitive match of the search term. */
export function TokenMatch({ text, term }: { text: string; term: string }) {
  const index = term ? text.toLowerCase().indexOf(term) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-foreground/10 text-foreground">
        {text.slice(index, index + term.length)}
      </mark>
      {text.slice(index + term.length)}
    </>
  );
}

export function TokenGroup({
  id,
  title,
  tokens,
  term,
  activeId,
  selectedId,
  optionId,
  networkName,
  cascade,
  onActivate,
  onSelect,
}: {
  id: string;
  title: string;
  tokens: readonly CryptoTradeToken[];
  term: string;
  activeId?: string;
  selectedId?: string;
  optionId: (tokenId: string) => string;
  networkName: (networkId: string) => string;
  /** Stagger rows only when the dialog first opens. */
  cascade: boolean;
  onActivate: (tokenId: string) => void;
  onSelect: (tokenId: string) => void;
}) {
  const reduce = useReducedMotion();
  if (!tokens.length) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: Listbox option groups use role="group"; a fieldset is not valid inside a listbox.
    <div role="group" aria-labelledby={id} className="pb-2">
      <p
        id={id}
        className="sticky top-0 z-10 bg-background px-2 pt-2 pb-1.5 text-xs text-muted-foreground"
      >
        {title}
      </p>
      <AnimatePresence mode="popLayout" initial={cascade}>
        {tokens.map((token, index) => {
          const active = token.id === activeId;
          const selected = token.id === selectedId;
          const held = token.balance > 0;
          const change = token.change24h;
          return (
            <motion.div
              key={token.id}
              layout={reduce ? false : "position"}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.3,
                  ease: EASE_OUT,
                  delay: cascade ? index * 0.035 : 0,
                },
              }}
              exit={{
                opacity: 0,
                transition: { duration: 0.12, ease: EASE_IN },
              }}
              transition={SPRING_LAYOUT}
            >
              <Button
                type="button"
                variant="plain"
                id={optionId(token.id)}
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onMouseMove={() => onActivate(token.id)}
                onClick={() => onSelect(token.id)}
                whileHover={undefined}
                whileTap={undefined}
                className="relative isolate flex w-full items-center gap-3 px-2 py-2.5 text-left"
              >
                {/* The shared Button is always pill-shaped, so the row paints its surface here. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 -z-10 rounded-2xl transition-colors",
                    active && "bg-muted",
                  )}
                />
                <CryptoTokenIcon
                  symbol={token.symbol}
                  network={token.network}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    <TokenMatch text={token.name} term={term} />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    <TokenMatch text={token.symbol} term={term} /> ·{" "}
                    {networkName(token.network)}
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="block text-sm font-medium">
                    {held
                      ? tradeAmount(token.balance, token.precision)
                      : tradePrice(token.usdPrice)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {held ? (
                      tradeUsd(token.balance * token.usdPrice)
                    ) : change === undefined ? (
                      "—"
                    ) : (
                      <span
                        className={
                          change >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {change >= 0 ? "+" : "−"}
                        {Math.abs(change).toFixed(2)}%
                      </span>
                    )}
                  </span>
                </span>
                <Check
                  aria-hidden="true"
                  className={cn("size-4 shrink-0", !selected && "invisible")}
                />
              </Button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
