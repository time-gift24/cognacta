"use client";

import {
  ArrowUpRight,
  Check,
  Cloud,
  FileCheck2,
  Fingerprint,
  Headphones,
  KeyRound,
  LockKeyhole,
  MapPin,
  Server,
  ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type EnterpriseReadinessCard = {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: ReactNode;
  points: string[];
};
export type EnterpriseControl = { label: string; icon: ReactNode };
export type TrustEnterpriseReadinessProps = {
  title?: string;
  description?: string;
  cards?: EnterpriseReadinessCard[];
  securityTitle?: string;
  securityDescription?: string;
  controls?: EnterpriseControl[];
  cta?: { label: string; href: string; external?: boolean };
  className?: string;
};

const defaultCards: EnterpriseReadinessCard[] = [
  {
    id: "support",
    label: "PEOPLE, NOT TICKETS",
    title: "A team in your corner.",
    description:
      "From the first conversation to your next milestone, work with people who understand your setup and stay close to the details.",
    icon: <Headphones className="size-5" />,
    points: [
      "A dedicated implementation partner",
      "A rollout shaped around your team",
      "Practical guidance as your needs change",
      "A clear path for priority support",
    ],
  },
  {
    id: "deployment",
    label: "YOUR ENVIRONMENT, YOUR CALL",
    title: "Fits the way you operate.",
    description:
      "Choose where your work runs and how your systems connect. Keep the tools you trust, with room to change direction later.",
    icon: <Server className="size-5" />,
    points: [
      "Cloud, private, or hybrid deployment",
      "Connect your existing tools and services",
      "Flexible identity and access policies",
      "A migration plan that keeps work moving",
    ],
  },
];
const defaultControls: EnterpriseControl[] = [
  { label: "Single sign-on", icon: <KeyRound className="size-4" /> },
  { label: "Role-based access", icon: <Fingerprint className="size-4" /> },
  { label: "Audit history", icon: <FileCheck2 className="size-4" /> },
  { label: "Data residency", icon: <MapPin className="size-4" /> },
  { label: "Encryption", icon: <LockKeyhole className="size-4" /> },
  { label: "Private networking", icon: <Cloud className="size-4" /> },
];

export function TrustEnterpriseReadiness({
  title = "Ready for the bigger picture.",
  description = "The support, flexibility, and control your next chapter needs.",
  cards = defaultCards,
  securityTitle = "Confidence comes built in.",
  securityDescription = "Make ownership clear, keep activity visible, and put the right boundaries around your work. Controls your team can understand and your administrators can manage.",
  controls = defaultControls,
  cta = {
    label: "Let’s talk through your needs",
    href: "mailto:hello@example.com",
  },
  className,
}: TrustEnterpriseReadinessProps) {
  const reduce = useReducedMotion();
  const reveal = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0 },
  };
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span
            aria-hidden
            className="mx-auto mb-5 grid size-12 place-items-center rounded-full border border-border"
          >
            <ShieldCheck className="size-5" />
          </span>
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <motion.div
          initial={reduce ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ staggerChildren: reduce ? 0 : 0.12 }}
          className="grid gap-4 md:grid-cols-2"
        >
          {cards.map((card) => (
            <motion.article
              key={card.id}
              variants={reveal}
              transition={{ duration: reduce ? 0 : 0.55, ease: EASE_OUT }}
              className="rounded-3xl border border-border bg-background p-6 sm:p-8"
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-muted"
                >
                  {card.icon}
                </span>
                <span className="text-right font-mono text-xs text-muted-foreground">
                  {card.label}
                </span>
              </div>
              <h3 className="text-xl font-medium tracking-tight">
                {card.title}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
                {card.description}
              </p>
              <ul className="mt-6 space-y-4 border-t border-border pt-6">
                {card.points.map((point, index) => (
                  <motion.li
                    key={point}
                    variants={reveal}
                    transition={{
                      duration: reduce ? 0 : 0.4,
                      delay: reduce ? 0 : index * 0.06,
                      ease: EASE_OUT,
                    }}
                    className="flex items-start gap-3 text-sm leading-6"
                  >
                    <Check
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-muted-foreground"
                    />
                    {point}
                  </motion.li>
                ))}
              </ul>
            </motion.article>
          ))}
          <motion.div
            variants={reveal}
            transition={{ duration: reduce ? 0 : 0.55, ease: EASE_OUT }}
            className="relative overflow-hidden rounded-3xl border border-border bg-background p-6 sm:p-8 md:col-span-2"
          >
            <div className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
              <div>
                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck aria-hidden className="size-4" />
                  <span>SECURITY & GOVERNANCE</span>
                </div>
                <h3 className="text-xl font-medium tracking-tight">
                  {securityTitle}
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
                  {securityDescription}
                </p>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {controls.map((control, index) => (
                  <motion.li
                    key={control.label}
                    variants={reveal}
                    transition={{
                      duration: reduce ? 0 : 0.4,
                      delay: reduce ? 0 : index * 0.05,
                      ease: EASE_OUT,
                    }}
                    className="flex min-h-12 items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm"
                  >
                    <span aria-hidden className="text-muted-foreground">
                      {control.icon}
                    </span>
                    {control.label}
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
        <div className="mt-8 flex justify-center">
          <ButtonLink
            href={cta.href}
            {...(cta.external
              ? { target: "_blank", rel: "noreferrer noopener" }
              : {})}
          >
            {cta.label}
            <ArrowUpRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
