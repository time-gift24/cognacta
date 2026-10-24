"use client";

import { ArrowRight, Check, Minus, Plus, Users } from "lucide-react";
import { useId, useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { RangeSlider } from "@/components/beui/motion/range-slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { cn } from "@/lib/beui/utils";

export type TeamCalculatorBilling = "monthly" | "yearly";
export type TeamCalculatorQuote = {
  seats: number;
  billing: TeamCalculatorBilling;
  monthlyCents: number;
  dueCents: number;
};
export type TeamCalculatorProps = {
  title?: string;
  description?: string;
  /** Base monthly price for one seat, in cents. */
  seatPriceCents?: number;
  currency?: string;
  defaultSeats?: number;
  yearlyDiscountPercent?: number;
  /** Highest qualifying tier applies to every seat, before the yearly discount. */
  volumeTiers?: { seats: number; percent: number }[];
  features?: string[];
  checkoutHref?: (quote: TeamCalculatorQuote) => string;
  className?: string;
};
const defaultTiers = [
  { seats: 10, percent: 10 },
  { seats: 25, percent: 20 },
  { seats: 50, percent: 25 },
];
const defaultFeatures = [
  "Unlimited projects and shared spaces",
  "Admin controls and member permissions",
  "Centralized billing for your whole team",
  "Priority support from real people",
];
const defaultCheckout = ({ seats, billing }: TeamCalculatorQuote) =>
  `/signup?plan=team&seats=${seats}&billing=${billing}`;
const MIN_SEATS = 2;
const MAX_SEATS = 100;

export function TeamCalculator({
  title = "Good work gets better together.",
  description = "One workspace for your whole team. Find your fit, see the full price, and leave room to grow.",
  seatPriceCents = 2400,
  currency = "$",
  defaultSeats = 10,
  yearlyDiscountPercent = 20,
  volumeTiers = defaultTiers,
  features = defaultFeatures,
  checkoutHref = defaultCheckout,
  className,
}: TeamCalculatorProps) {
  const [seats, setSeats] = useState(
    Math.min(MAX_SEATS, Math.max(MIN_SEATS, Math.round(defaultSeats))),
  );
  const [billing, setBilling] = useState<TeamCalculatorBilling>("monthly");
  const billingId = useId();
  const tiers = [...volumeTiers].sort((a, b) => a.seats - b.seats);
  const tier = tiers.filter((t) => seats >= t.seats).at(-1);
  const nextTier = tiers.find((t) => t.seats > seats);
  const volumePercent = Math.max(0, Math.min(100, tier?.percent ?? 0));
  const annualPercent = Math.max(0, Math.min(100, yearlyDiscountPercent));
  const baseCents = Math.max(0, Math.round(seatPriceCents)) * seats;
  const volumeSavings = Math.round((baseCents * volumePercent) / 100);
  const yearlySavings =
    billing === "yearly"
      ? Math.round(((baseCents - volumeSavings) * annualPercent) / 100)
      : 0;
  const monthlyCents = baseCents - volumeSavings - yearlySavings;
  const dueCents = billing === "yearly" ? monthlyCents * 12 : monthlyCents;
  const money = (cents: number) =>
    `${currency}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-9 max-w-xl">
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Made for teams
          </p>
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="grid overflow-hidden rounded-3xl border border-border lg:grid-cols-[1.3fr_1fr]">
          <div className="min-w-0 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-muted">
                <Users aria-hidden className="size-5" strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="text-xl font-medium">Your team, your size.</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  From 2 to 100 people
                </p>
              </div>
            </div>
            <div className="mb-4 mt-8 flex items-center justify-between gap-4">
              <p className="text-sm font-medium">Team members</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  aria-label="Remove one seat"
                  disabled={seats === MIN_SEATS}
                  onClick={() => setSeats((s) => Math.max(MIN_SEATS, s - 1))}
                  className="size-9 p-0 hover:bg-muted"
                >
                  <Minus aria-hidden className="size-4" />
                </Button>
                <output
                  className="min-w-10 text-center text-xl font-medium tabular-nums"
                  aria-label="Selected seats"
                >
                  {seats}
                </output>
                <Button
                  variant="outline"
                  aria-label="Add one seat"
                  disabled={seats === MAX_SEATS}
                  onClick={() => setSeats((s) => Math.min(MAX_SEATS, s + 1))}
                  className="size-9 p-0 hover:bg-muted"
                >
                  <Plus aria-hidden className="size-4" />
                </Button>
              </div>
            </div>
            <RangeSlider
              aria-label="Team size"
              min={MIN_SEATS}
              max={MAX_SEATS}
              step={1}
              value={seats}
              onValueChange={setSeats}
              showTicks={false}
              className="h-10"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>2 people</span>
              <span>100 people</span>
            </div>
            <p className="mt-5 min-h-10 text-xs leading-5 text-muted-foreground">
              {nextTier
                ? `At ${nextTier.seats} seats, save ${nextTier.percent}% on every seat. Discounts apply automatically.`
                : `You’ve unlocked our highest volume discount: ${volumePercent}%.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {tiers.map((t) => (
                <span
                  key={t.seats}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs",
                    tier?.seats === t.seats
                      ? "border-foreground text-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {tier?.seats === t.seats && (
                    <Check aria-hidden className="size-3" />
                  )}
                  {t.seats}+ seats · {t.percent}% off
                </span>
              ))}
            </div>
            <div className="mt-8 border-t border-border pt-6">
              <p className="mb-4 text-xs font-medium">Every seat comes with</p>
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2.5 text-sm text-muted-foreground"
                  >
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-foreground"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex min-w-0 flex-col border-t border-border p-6 sm:p-8 lg:border-l lg:border-t-0">
            <Tabs
              value={billing}
              onValueChange={(value) =>
                setBilling(value as TeamCalculatorBilling)
              }
            >
              <TabsList aria-label="Team billing period">
                {(["monthly", "yearly"] as const).map((value) => (
                  <TabsTrigger
                    key={value}
                    id={`${billingId}-${value}`}
                    value={value}
                    tabIndex={billing === value ? 0 : -1}
                    className="h-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    onKeyDown={(event) => {
                      if (
                        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          event.key,
                        )
                      )
                        return;
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? "monthly"
                          : event.key === "End"
                            ? "yearly"
                            : value === "monthly"
                              ? "yearly"
                              : "monthly";
                      setBilling(next);
                      document.getElementById(`${billingId}-${next}`)?.focus();
                    }}
                  >
                    {value === "monthly" ? "Monthly" : "Yearly"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <p className="mb-3 mt-7 text-sm text-muted-foreground">
              Your team total
            </p>
            <div className="flex flex-wrap items-baseline gap-2">
              <NumberTicker
                value={monthlyCents}
                format={money}
                animateOnMount={false}
                duration={0.35}
                className="text-5xl font-medium tracking-tight"
              />
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {billing === "yearly"
                ? `${money(dueCents)} billed yearly`
                : `${money(dueCents)} billed monthly`}{" "}
              · {seats} seats
            </p>
            <dl className="my-7 space-y-4 border-y border-border py-6 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {seats} seats × {money(seatPriceCents)}
                </dt>
                <dd className="tabular-nums">{money(baseCents)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  Volume discount ({volumePercent}%)
                </dt>
                <dd className="tabular-nums">−{money(volumeSavings)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  Yearly savings ({billing === "yearly" ? annualPercent : 0}%)
                </dt>
                <dd className="tabular-nums">−{money(yearlySavings)}</dd>
              </div>
            </dl>
            <p className="mb-6 text-xs leading-5 text-muted-foreground">
              {billing === "monthly"
                ? `Choose yearly billing to save another ${annualPercent}% after your volume discount.`
                : `You save ${money((volumeSavings + yearlySavings) * 12)} a year compared with standard monthly pricing.`}
            </p>
            <ButtonLink
              href={checkoutHref({ seats, billing, monthlyCents, dueCents })}
              className="mt-auto h-9 w-full"
            >
              Start with {seats} seats{" "}
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Taxes calculated at checkout.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
