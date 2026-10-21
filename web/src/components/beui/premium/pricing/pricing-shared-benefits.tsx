"use client";

import { ArrowRight, Check } from "lucide-react";
import { useId, useState } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { cn } from "@/lib/beui/utils";
import { FOOTER_PANORAMA_ART } from "../footer-sections/footer-panorama-art";
import { AnimatedPrice } from "./animated-price";

export type SharedBenefitsPlan = {
  id: string;
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  detail: string;
};
export type SharedBenefitsBilling = "monthly" | "yearly";
export type PricingSharedBenefitsProps = {
  title?: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  benefitsTitle?: string;
  benefits?: string[];
  plans?: SharedBenefitsPlan[];
  defaultPlan?: string;
  currency?: string;
  checkoutHref?: (
    plan: SharedBenefitsPlan,
    billing: SharedBenefitsBilling,
  ) => string;
  className?: string;
};
const defaultPlans: SharedBenefitsPlan[] = [
  {
    id: "solo",
    name: "Solo",
    description: "For your own ideas",
    monthly: 16,
    yearly: 12,
    detail: "1 person · 10 active projects · 25 GB storage",
  },
  {
    id: "studio",
    name: "Studio",
    description: "For a small, focused team",
    monthly: 48,
    yearly: 36,
    detail: "5 people · 50 active projects · 100 GB storage",
  },
  {
    id: "collective",
    name: "Collective",
    description: "For bigger collaborations",
    monthly: 96,
    yearly: 72,
    detail: "15 people · Unlimited projects · 500 GB storage",
  },
];
const defaultBenefits = [
  "All creative tools, from day one",
  "Unlimited guests and shared links",
  "Version history and automatic backups",
  "Export your work in original quality",
  "Personal support when you need it",
];
const defaultCheckout = (
  plan: SharedBenefitsPlan,
  billing: SharedBenefitsBilling,
) => `/signup?plan=${encodeURIComponent(plan.id)}&billing=${billing}`;

export function PricingSharedBenefits({
  title = "The same great tools. Your kind of space.",
  description = "Every plan starts with the essentials. Choose the room you need to make something worth sharing.",
  imageSrc = FOOTER_PANORAMA_ART,
  imageAlt = "Painted coastal cliffs overlooking a calm blue inlet",
  benefitsTitle = "A good foundation, on every plan.",
  benefits = defaultBenefits,
  plans = defaultPlans,
  defaultPlan = "studio",
  currency = "$",
  checkoutHref = defaultCheckout,
  className,
}: PricingSharedBenefitsProps) {
  const [selected, setSelected] = useState(defaultPlan);
  const [billing, setBilling] = useState<SharedBenefitsBilling>("monthly");
  const planId = useId();
  const billingId = useId();
  const plan = plans.find((item) => item.id === selected) ?? plans[0];
  if (!plan) return null;
  const price = plan[billing];
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-9 max-w-2xl">
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="grid overflow-hidden rounded-3xl lg:grid-cols-2">
          <div className="min-w-0 p-5 sm:p-7">
            <div className="overflow-hidden rounded-2xl">
              {/* biome-ignore lint/performance/noImgElement: bundled artwork is portable outside Next.js */}
              <img
                src={imageSrc}
                alt={imageAlt}
                loading="lazy"
                className="aspect-[2/1] w-full object-cover dark:brightness-75"
              />
            </div>
            <div className="px-1 pb-2 pt-7">
              <p className="mb-2 text-xs text-muted-foreground">
                Always included
              </p>
              <h3 className="text-xl font-medium tracking-tight">
                {benefitsTitle}
              </h3>
              <ul className="mt-6 space-y-4">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex gap-3 text-sm leading-5 text-muted-foreground"
                  >
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-foreground"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="min-w-0 p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl font-medium">Make it yours.</h3>
              <Tabs
                value={billing}
                onValueChange={(value) =>
                  setBilling(value as SharedBenefitsBilling)
                }
              >
                <TabsList aria-label="Billing period">
                  {(["monthly", "yearly"] as const).map((value) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      id={`${billingId}-${value}`}
                      tabIndex={billing === value ? 0 : -1}
                      className="h-8 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                        document
                          .getElementById(`${billingId}-${next}`)
                          ?.focus();
                      }}
                    >
                      {value === "monthly" ? "Monthly" : "Yearly"}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <fieldset className="space-y-3">
              <legend className="sr-only">Choose your plan</legend>
              {plans.map((item) => (
                <label key={item.id} className="relative block cursor-pointer">
                  <input
                    type="radio"
                    name={planId}
                    value={item.id}
                    checked={plan.id === item.id}
                    onChange={() => setSelected(item.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex items-center gap-4 rounded-2xl border border-border p-4 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                      plan.id === item.id ? "bg-muted" : "bg-background",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                        plan.id === item.id
                          ? "border-foreground"
                          : "border-border",
                      )}
                    >
                      <span
                        className={cn(
                          "size-2.5 rounded-full bg-foreground transition-transform motion-reduce:transition-none",
                          plan.id === item.id ? "scale-100" : "scale-0",
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {item.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-base font-medium tabular-nums">
                        {currency}
                        {item[billing]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / month
                      </span>
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="mt-6 border-t border-border pt-5">
              <p className="mb-3 text-xs leading-5 text-muted-foreground">
                {plan.detail}
              </p>
              <div className="flex flex-wrap items-end gap-1">
                <AnimatedPrice
                  amount={price}
                  currency={currency}
                  className="text-4xl font-medium tracking-tight"
                />
                <span className="pb-2 text-xs text-muted-foreground">
                  / month
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {billing === "yearly"
                  ? `${currency}${(price * 12).toLocaleString("en-US")} billed yearly`
                  : "Billed monthly"}
              </p>
              <ButtonLink
                href={checkoutHref(plan, billing)}
                className="mt-5 h-9 w-full"
              >
                Continue with {plan.name}
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
