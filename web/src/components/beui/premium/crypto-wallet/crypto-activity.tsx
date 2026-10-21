"use client";

/*
 * Storyboard
 * 1. Mount: rows blur-rise 40ms apart, group by group.
 * 2. Filter or search: the status pill glides; surviving rows slide into
 *    place, new rows rise in, and removed rows fade out in 150ms.
 * 3. Pending rows spin a thin ring around their badge.
 * 4. Open: the details sheet slides in, its timeline steps rise in sequence,
 *    and a live "Confirming" step sweeps while pending.
 * Reduced motion: rows fade only, with no glide, spin, or sweep.
 */

import { Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { AnimatedModal } from "@/components/beui/motion/animated-modal";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CryptoActivityDetail } from "./crypto-activity-detail";
import { CryptoActivityRow } from "./crypto-activity-row";
import {
  CRYPTO_STATUS_LABELS,
  type CryptoActivityStatus,
  groupCryptoTransactions,
} from "./crypto-activity-utils";
import {
  CRYPTO_REFERENCE_DATE,
  CRYPTO_TRANSACTIONS,
  type CryptoTransaction,
} from "./crypto-wallet-data";

export type CryptoActivityProps = {
  transactions?: readonly CryptoTransaction[];
  demo?: boolean;
  /** "Now" for grouping. Defaults to the sample date in demo mode. */
  referenceDate?: string;
  className?: string;
};

const STATUSES: CryptoActivityStatus[] = [
  "all",
  "pending",
  "confirmed",
  "failed",
];

export function CryptoActivity({
  transactions = CRYPTO_TRANSACTIONS,
  demo = true,
  referenceDate = demo ? CRYPTO_REFERENCE_DATE : new Date().toISOString(),
  className,
}: CryptoActivityProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<CryptoActivityStatus>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cascade, setCascade] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setCascade(false), 700);
    return () => clearTimeout(timeout);
  }, []);

  const selected = transactions.find((item) => item.id === selectedId);
  const term = query.toLowerCase().trim();
  const matches = transactions.filter((transaction) =>
    [
      transaction.title,
      transaction.symbol,
      transaction.toSymbol,
      transaction.hash,
      transaction.address,
      transaction.network,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
  const count = (value: CryptoActivityStatus) =>
    value === "all"
      ? matches.length
      : matches.filter((transaction) => transaction.status === value).length;
  const filtered = matches.filter(
    (transaction) => status === "all" || transaction.status === status,
  );
  const groups = groupCryptoTransactions(filtered, referenceDate);
  let order = 0;

  return (
    <section
      aria-label="Wallet activity"
      className={cn(
        "w-full bg-background px-4 py-12 text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-lg">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-medium">Activity</h2>
          <span className="text-xs text-muted-foreground">
            {transactions.length} transactions
          </span>
        </div>
        <Input
          leftIcon={<Search />}
          value={query}
          onChange={setQuery}
          placeholder="Search token, address, or network"
          aria-label="Search transactions"
          className="mt-6"
        />
        <Tabs
          value={status}
          onValueChange={(value) => setStatus(value as CryptoActivityStatus)}
          className="mt-3"
        >
          <TabsList
            aria-label="Transaction status"
            className="flex w-full *:flex-1"
          >
            {STATUSES.map((item, index) => (
              <TabsTrigger
                key={item}
                value={item}
                id={`${id}-status-${item}`}
                tabIndex={status === item ? 0 : -1}
                className="h-8 w-full gap-1.5 px-2 text-xs"
                onKeyDown={(event) => {
                  const step =
                    event.key === "ArrowRight"
                      ? 1
                      : event.key === "ArrowLeft"
                        ? -1
                        : 0;
                  if (!step) return;
                  event.preventDefault();
                  const next =
                    STATUSES[
                      (index + step + STATUSES.length) % STATUSES.length
                    ];
                  setStatus(next);
                  document.getElementById(`${id}-status-${next}`)?.focus();
                }}
              >
                {item === "all" ? "All" : CRYPTO_STATUS_LABELS[item]}
                <span className="text-muted-foreground tabular-nums">
                  {count(item)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-6 space-y-6" aria-live="polite">
          <AnimatePresence initial={false} mode="popLayout">
            {groups.map(([label, items]) => (
              <motion.section
                key={label}
                aria-label={label}
                layout={reduce ? false : "position"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, ease: EASE_IN },
                }}
                transition={SPRING_LAYOUT}
              >
                <h3 className="mb-1 px-2 text-sm font-medium text-muted-foreground">
                  {label}
                </h3>
                <ul>
                  <AnimatePresence initial={cascade} mode="popLayout">
                    {items.map((transaction) => {
                      const delay = cascade ? order++ * 0.04 : 0;
                      return (
                        <motion.li
                          key={transaction.id}
                          layout={reduce ? false : "position"}
                          initial={
                            reduce
                              ? { opacity: 0 }
                              : { opacity: 0, y: 8, filter: "blur(4px)" }
                          }
                          animate={{
                            opacity: 1,
                            y: 0,
                            filter: "blur(0px)",
                            transition: {
                              duration: 0.4,
                              ease: EASE_OUT,
                              delay,
                            },
                          }}
                          exit={{
                            opacity: 0,
                            transition: { duration: 0.15, ease: EASE_IN },
                          }}
                          transition={SPRING_LAYOUT}
                          className="-mx-2"
                        >
                          <CryptoActivityRow
                            transaction={transaction}
                            onOpen={() => {
                              setSelectedId(transaction.id);
                              setDetailOpen(true);
                            }}
                          />
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
        {!filtered.length ? (
          <div className="py-16 text-center">
            <h3 className="text-xl font-medium">No transactions found</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Try another search or status.
            </p>
          </div>
        ) : null}
        {demo ? (
          <p className="mt-6 text-xs text-muted-foreground">
            Demo activity · No live wallet transactions
          </p>
        ) : null}

        <AnimatedModal
          open={detailOpen && Boolean(selected)}
          onOpenChange={setDetailOpen}
          // Keep the transaction mounted until the sheet finishes closing.
          onExitComplete={() => setSelectedId(null)}
          viewportClassName="inset-0 [&>div]:items-stretch [&>div]:justify-end"
          panelClassName="min-h-dvh max-h-dvh max-w-md overflow-y-auto rounded-l-3xl p-6 sm:p-8"
          backdropClassName="backdrop-blur-sm"
        >
          {selected ? (
            <CryptoActivityDetail
              transaction={selected}
              demo={demo}
              onClose={() => setDetailOpen(false)}
            />
          ) : null}
        </AnimatedModal>
      </div>
    </section>
  );
}
