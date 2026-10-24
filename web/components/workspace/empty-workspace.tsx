"use client";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { BrandMark } from "../brand-mark";
import { EASE_OUT } from "@/lib/ease";
import { starterSeeds } from "./config";
import { Composer } from "./composer";
import type { ComposerProps } from "./types";
export function EmptyWorkspace({
  onStarterClick,
  ...composerProps
}: ComposerProps & {
  onStarterClick: (prompt: string) => void;
}) {
  const reduce = useReducedMotion();
  const t = useTranslations("Home");
  const tDemo = useTranslations("Demo");
  const starters = starterSeeds.map((starter) => ({
    ...starter,
    title: tDemo(`starters.${starter.key}.title`),
    prompt: tDemo(`starters.${starter.key}.prompt`),
  }));
  return (
    <div
      id="workspace"
      className="mx-auto flex min-h-full w-full max-w-[44rem] flex-col px-4 pt-[clamp(4rem,11vh,7.5rem)] pb-6 sm:px-6"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        className="text-center"
      >
        <span className="mx-auto grid size-10 place-items-center rounded-xl border border-border-strong bg-surface-raised text-primary">
          <BrandMark className="size-4.5" />
        </span>
        <h1 className="mt-4 text-balance font-medium text-[clamp(1.65rem,4vw,2.15rem)] leading-tight tracking-[-0.04em]">
          {t("heading")}
        </h1>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.6, ease: EASE_OUT }}
        className="mt-7"
      >
        <Composer {...composerProps} />
      </motion.div>

      <motion.div
        initial={reduce ? false : "hidden"}
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.06, delayChildren: 0.16 },
          },
        }}
        aria-label={t("projectSuggestions")}
        className="mt-4 flex flex-wrap justify-center gap-2"
      >
        {starters.map((starter) => (
          <motion.button
            key={starter.key}
            type="button"
            onClick={() => onStarterClick(starter.prompt)}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-transparent px-3.5 py-2 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <starter.icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            <span>{starter.title}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
