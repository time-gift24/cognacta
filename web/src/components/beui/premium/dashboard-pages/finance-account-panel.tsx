"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Eye,
  EyeOff,
  LockKeyhole,
  Pause,
  Play,
  Radio,
  Wallet,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT } from "@/lib/beui/ease";
import {
  type FinanceAccount,
  type FinanceTransaction,
  financeMoney,
} from "./finance-dashboard-data";
import { PlanningFilter, PlanningProgress, planningDate } from "./planning-ui";

export function FinanceAccountPanel({
  accounts,
  account,
  currency,
  balance,
  spent,
  updates,
  asOf,
  onAccountChange,
  onCardStateChange,
}: {
  accounts: readonly FinanceAccount[];
  account: FinanceAccount;
  currency: string;
  balance: number;
  spent: number;
  updates: readonly FinanceTransaction[];
  asOf: string;
  onAccountChange: (id: string) => void;
  onCardStateChange?: (paused: boolean) => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [pausedCards, setPausedCards] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState(false);
  const reduce = useReducedMotion();
  const paused = pausedCards[account.id] ?? false;
  const usage = account.monthlyBudget
    ? (spent / account.monthlyBudget) * 100
    : 0;
  return (
    <aside className="min-w-0 space-y-5">
      <section
        aria-label="Spending account"
        className="rounded-2xl border border-border bg-background p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl font-medium">Spending account</h2>
          <Button
            variant="ghost"
            className="size-9 rounded-full p-0"
            aria-label={hidden ? "Show balance" : "Hide balance"}
            aria-pressed={hidden}
            onClick={() => setHidden((value) => !value)}
          >
            {hidden ? (
              <EyeOff aria-hidden className="size-4" />
            ) : (
              <Eye aria-hidden className="size-4" />
            )}
          </Button>
        </div>
        <PlanningFilter
          label="Spending account"
          value={account.id}
          icon={Wallet}
          onChange={onAccountChange}
          options={accounts.map((item) => ({
            value: item.id,
            label: item.name,
            icon: Wallet,
          }))}
        />
        <motion.div
          key={account.id}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
          className="relative mt-5 overflow-hidden rounded-2xl border border-border bg-background p-5"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/15 via-background to-primary/5"
          />
          <div className="relative">
            <div className="flex justify-between gap-3 text-xs text-muted-foreground">
              <span>Available balance</span>
              <Radio aria-hidden className="size-4 text-primary" />
            </div>
            <div className="mt-3 min-h-10">
              {hidden ? (
                <span
                  role="img"
                  aria-label="Balance hidden"
                  className="text-3xl tracking-widest"
                >
                  ••••••
                </span>
              ) : (
                <NumberTicker
                  value={balance}
                  format={(value) => financeMoney(value, currency, 2)}
                  startOnView={false}
                  className="text-3xl font-medium tabular-nums tracking-tight"
                />
              )}
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <CreditCard aria-hidden className="size-5" />
                <span className="font-mono">•••• {account.lastFour}</span>
              </span>
              <span>{paused ? "Paused" : "Virtual card"}</span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
              <span className="text-sm">{account.holder}</span>
              <span className="text-xs text-muted-foreground">
                Expires {account.expires}
              </span>
            </div>
          </div>
        </motion.div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-full text-xs"
            onClick={() => setDetails(true)}
          >
            <CreditCard aria-hidden className="size-3.5" />
            Card details
          </Button>
          <Button
            variant="ghost"
            className="h-9 rounded-full text-xs"
            aria-pressed={paused}
            onClick={() => {
              setPausedCards((current) => ({
                ...current,
                [account.id]: !paused,
              }));
              onCardStateChange?.(!paused);
            }}
          >
            {paused ? (
              <Play aria-hidden className="size-3.5" />
            ) : (
              <Pause aria-hidden className="size-3.5" />
            )}
            {paused ? "Resume card" : "Pause card"}
          </Button>
        </div>
        <span className="sr-only" aria-live="polite">
          {account.name} card {paused ? "paused" : "active"}
        </span>
      </section>
      <section
        aria-label="Monthly allowance"
        className="rounded-2xl border border-border bg-background p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-medium">Monthly allowance</h2>
          <LockKeyhole aria-hidden className="size-4 text-muted-foreground" />
        </div>
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <span>
            {new Intl.DateTimeFormat("en-US", {
              month: "long",
              timeZone: "UTC",
            }).format(new Date(`${asOf}T00:00:00Z`))}{" "}
            spending
          </span>
          <span className="tabular-nums">{Math.round(usage)}%</span>
        </div>
        <PlanningProgress
          value={usage}
          label="Monthly allowance used"
          className="mt-3"
        />
        <div className="mt-3 flex justify-between gap-3 text-xs">
          <span>{financeMoney(spent, currency)} used</span>
          <span className="text-muted-foreground">
            of {financeMoney(account.monthlyBudget, currency)}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {spent > account.monthlyBudget
            ? `${financeMoney(spent - account.monthlyBudget, currency)} above allowance`
            : `${financeMoney(account.monthlyBudget - spent, currency)} available this month`}
        </p>
      </section>
      <section
        aria-label="Recent account activity"
        className="overflow-hidden rounded-2xl border border-border bg-background"
      >
        <div className="p-5">
          <h2 className="text-xl font-medium">Latest movements</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Updates within the selected period
          </p>
        </div>
        <ul className="divide-y divide-border px-5">
          {updates.slice(0, 4).map((t) => (
            <li key={t.id} className="flex items-start gap-3 py-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                {t.kind === "incoming" ? (
                  <ArrowDownLeft aria-hidden className="size-4" />
                ) : (
                  <ArrowUpRight aria-hidden className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{t.merchant}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.status === "settled"
                    ? "Posted"
                    : t.status === "pending"
                      ? "Processing"
                      : "Payment declined"}{" "}
                  · {planningDate(t.at.slice(0, 10))}
                </p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {financeMoney(t.amount, currency)}
              </span>
            </li>
          ))}
          {!updates.length && (
            <li className="pb-5 text-sm text-muted-foreground">
              No movements in this period.
            </li>
          )}
        </ul>
      </section>
      <AnimatedModal
        open={details}
        onOpenChange={setDetails}
        panelClassName="max-w-md rounded-2xl border border-border p-6"
      >
        <div className="flex justify-between gap-3">
          <div>
            <AnimatedModalTitle className="text-xl font-medium">
              {account.name}
            </AnimatedModalTitle>
            <AnimatedModalDescription className="mt-2 text-sm text-muted-foreground">
              Virtual card and account overview.
            </AnimatedModalDescription>
          </div>
          <Button
            variant="ghost"
            className="size-9 rounded-full p-0"
            aria-label="Close card details"
            onClick={() => setDetails(false)}
          >
            <X aria-hidden className="size-4" />
          </Button>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-5 text-sm">
          {[
            ["Cardholder", account.holder],
            ["Card ending", account.lastFour],
            ["Expires", account.expires],
            ["Card state", paused ? "Paused" : "Active"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1">{value}</dd>
            </div>
          ))}
        </dl>
      </AnimatedModal>
    </aside>
  );
}
