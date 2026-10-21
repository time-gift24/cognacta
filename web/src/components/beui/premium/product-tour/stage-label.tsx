"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { STAGE_LABEL_FADE } from "./product-tour-motion";

/** Small mono caption that fades in above a stage column. */
export function StageLabel({ children }: { children: ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={STAGE_LABEL_FADE}
      className="mb-3 font-mono text-muted-foreground text-xs uppercase tracking-widest"
    >
      {children}
    </motion.p>
  );
}
