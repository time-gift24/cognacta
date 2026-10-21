"use client";

import { BorderBeam } from "border-beam";
import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { AnimatedPrice } from "./animated-price";

export type AiPricingBilling = "monthly" | "annual";
export type AiPricingUsage = "5x" | "20x";
export type AiPricingSelection = {
  plan: "free" | "pro" | "team";
  billing: AiPricingBilling;
  usage: AiPricingUsage;
};
export type AiPricingProps = {
  title?: string;
  description?: string;
  currency?: string;
  /** Monthly amounts; annual values are the monthly equivalent. */
  prices?: Record<AiPricingUsage | "team", Record<AiPricingBilling, number>>;
  defaultBilling?: AiPricingBilling;
  defaultUsage?: AiPricingUsage;
  /** Connect this to your checkout, preserving the selected billing and usage. */
  checkoutHref?: (selection: AiPricingSelection) => string;
  className?: string;
};
const defaultPrices = {
  "5x": { monthly: 40, annual: 32 },
  "20x": { monthly: 100, annual: 80 },
  team: { monthly: 30, annual: 24 },
};
const defaultCheckoutHref = ({ plan, billing, usage }: AiPricingSelection) =>
  `/signup?plan=${plan}&billing=${billing}&usage=${usage}`;
const features = {
  free: [
    "Everyday questions and writing",
    "Standard model access",
    "Limited file and image uploads",
    "Saved conversations",
  ],
  pro: [
    "Our most capable models",
    "Deep research and advanced reasoning",
    "Larger files and longer conversations",
    "Projects with persistent context",
    "Priority access during busy hours",
  ],
  team: [
    "Everything in Pro at 5× usage per seat",
    "A shared workspace for your team",
    "Centralized billing and admin controls",
    "Team content excluded from training",
    "Manage members and permissions",
  ],
};

export function AiPricing({
  title = "A little help. A bigger possibility.",
  description = "From your first question to your most ambitious work. Find the space to think, create, and go further.",
  currency = "$",
  prices = defaultPrices,
  defaultBilling = "monthly",
  defaultUsage = "5x",
  checkoutHref = defaultCheckoutHref,
  className,
}: AiPricingProps) {
  const [billing, setBilling] = useState<AiPricingBilling>(defaultBilling);
  const [usage, setUsage] = useState<AiPricingUsage>(defaultUsage);
  const reduce = useReducedMotion();
  const [usageScan, setUsageScan] = useState(0);
  const [switchingUsage, setSwitchingUsage] = useState(false);
  useEffect(() => {
    if (usageScan === 0) return;
    const timeout = setTimeout(() => setSwitchingUsage(false), 1400);
    return () => clearTimeout(timeout);
  }, [usageScan]);
  const changeUsage = (next: AiPricingUsage) => {
    if (next === usage) return;
    setUsage(next);
    setSwitchingUsage(true);
    setUsageScan((count) => count + 1);
  };
  const usageId = useId();
  const billingId = useId();
  const proPrice = prices[usage][billing];
  const teamPrice = prices.team[billing];
  const billingNote = (price: number, perSeat = false) =>
    billing === "annual"
      ? `${currency}${new Intl.NumberFormat("en-US").format(price * 12)} billed yearly${perSeat ? " per person" : ""}`
      : "Billed monthly";
  return (
    <section className={cn("w-full bg-background text-foreground", className)}>
      <div className="mx-auto max-w-7xl px-6 pb-16 sm:px-10">
        <div className="mx-auto max-w-2xl pb-9 pt-10 text-center sm:pt-16">
          <p className="mb-4 text-xs font-medium text-muted-foreground">
            Simple plans. More room to think.
          </p>
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
          <Tabs
            value={billing}
            onValueChange={(value) => setBilling(value as AiPricingBilling)}
            className="mt-7"
          >
            <TabsList aria-label="Billing period">
              {(["monthly", "annual"] as const).map((value) => (
                <TabsTrigger
                  key={value}
                  id={`${billingId}-${value}`}
                  value={value}
                  tabIndex={billing === value ? 0 : -1}
                  className="h-9 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                          ? "annual"
                          : value === "monthly"
                            ? "annual"
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
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {(["free", "pro", "team"] as const).map((plan, index) => {
            const isPro = plan === "pro";
            const amount = plan === "free" ? 0 : isPro ? proPrice : teamPrice;
            return (
              <motion.section
                key={plan}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.06,
                  ease: EASE_OUT,
                }}
                className={cn(
                  "relative isolate flex flex-col rounded-3xl border bg-background p-6 sm:p-7",
                  "border-border",
                )}
              >
                {isPro && (
                  <BorderBeam
                    aria-hidden="true"
                    active={!reduce}
                    colorVariant="sunset"
                    theme="auto"
                    staticColors
                    duration={switchingUsage && !reduce ? 1.2 : 5}
                    strength={switchingUsage && !reduce ? 1 : 0.55}
                    size="md"
                    className="pointer-events-none rounded-3xl [&>[data-beam-bloom]]:hidden"
                    style={{ position: "absolute", inset: -1 }}
                  >
                    <div className="size-full rounded-3xl" />
                  </BorderBeam>
                )}
                {isPro && usageScan > 0 && !reduce && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl"
                  >
                    <motion.div
                      key={usageScan}
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(ellipse at center, rgba(251, 191, 136, 0.3), rgba(252, 220, 179, 0.14) 38%, transparent 70%)",
                      }}
                      initial={{ x: "-65%", y: "40%", opacity: 0 }}
                      animate={{ x: "65%", y: "-40%", opacity: [0, 1, 0] }}
                      transition={{ duration: 1.2, ease: EASE_OUT }}
                    />
                  </div>
                )}
                <div className="flex min-h-11 items-center justify-between gap-4">
                  <h2 className="text-xl font-medium">
                    {plan === "free" ? "Free" : isPro ? "Pro" : "Team"}
                  </h2>
                  {isPro && (
                    <Tabs
                      value={usage}
                      onValueChange={(value) =>
                        changeUsage(value as AiPricingUsage)
                      }
                    >
                      <TabsList aria-label="Pro usage" className="gap-0.5 p-1">
                        {(["5x", "20x"] as const).map((value) => (
                          <TabsTrigger
                            key={value}
                            id={`${usageId}-${value}`}
                            value={value}
                            tabIndex={usage === value ? 0 : -1}
                            className="h-7 min-w-12 px-3 py-1 text-xs before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            onKeyDown={(event) => {
                              if (
                                ![
                                  "ArrowLeft",
                                  "ArrowRight",
                                  "Home",
                                  "End",
                                ].includes(event.key)
                              )
                                return;
                              event.preventDefault();
                              const next =
                                event.key === "Home"
                                  ? "5x"
                                  : event.key === "End"
                                    ? "20x"
                                    : value === "5x"
                                      ? "20x"
                                      : "5x";
                              changeUsage(next);
                              document
                                .getElementById(`${usageId}-${next}`)
                                ?.focus();
                            }}
                          >
                            {value}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  )}
                </div>
                <div className="mt-6">
                  <AnimatedPrice
                    amount={amount}
                    currency={currency}
                    className="text-5xl font-medium tracking-tight"
                  />
                  <span className="ml-1 text-xs text-muted-foreground">
                    {plan === "free"
                      ? "/ forever"
                      : plan === "team"
                        ? "/ person / month"
                        : "/ month"}
                  </span>
                </div>
                <p className="mt-1 min-h-5 text-xs text-muted-foreground">
                  {plan === "free"
                    ? "No credit card needed"
                    : billingNote(amount, plan === "team")}
                </p>
                <div className="my-6 min-h-20">
                  <p className="pt-3 text-sm leading-6 text-muted-foreground">
                    {plan === "free"
                      ? "Start with the essentials. Upgrade when you need more space."
                      : isPro
                        ? usage === "5x"
                          ? "5× usage for everyday work. More room to write, research, and create."
                          : "20× usage for your biggest ideas. Go deeper with longer, more demanding work."
                        : "5× usage for every person. Start with 2 or more teammates."}
                  </p>
                </div>
                <ButtonLink
                  href={checkoutHref({
                    plan,
                    billing,
                    usage: isPro ? usage : "5x",
                  })}
                  variant={isPro ? "primary" : "outline"}
                  className={cn("h-10 w-full", !isPro && "hover:bg-muted")}
                >
                  {plan === "free"
                    ? "Start for free"
                    : isPro
                      ? `Get Pro ${usage === "5x" ? "5×" : "20×"}`
                      : "Create a team"}
                  <ArrowRight aria-hidden className="size-4" />
                </ButtonLink>
                <p className="mb-4 mt-7 text-xs font-medium">
                  {plan === "free"
                    ? "A useful place to start"
                    : isPro
                      ? "Everything in Free, plus"
                      : "Built for shared work"}
                </p>
                <ul className="space-y-3">
                  {features[plan].map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-2.5 text-sm leading-5 text-muted-foreground"
                    >
                      <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-foreground"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.section>
            );
          })}
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Usage limits apply. Allowances vary with model, message length, and
          tools. Taxes may apply.
        </p>
      </div>
    </section>
  );
}
