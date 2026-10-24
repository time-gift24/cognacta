"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING_SWAP } from "@/lib/beui/ease";
import { CryptoNetworkIcon } from "./crypto-token-icon";

/** One bordered leg with a header row (label and an aside) and a footer. */
export function CryptoBridgeLeg({
  label,
  network,
  aside,
  amount,
  token,
  footer,
  children,
}: {
  label: string;
  network: { id: string; name: string };
  aside: ReactNode;
  amount: ReactNode;
  token: ReactNode;
  footer: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-background px-5 pt-3.5 pb-4 transition-colors focus-within:border-foreground/30">
      <div className="flex h-7 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          {label}
          <span aria-hidden="true">·</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={network.id}
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={SPRING_SWAP}
              className="flex items-center gap-1.5 text-foreground"
            >
              <CryptoNetworkIcon network={network.id} className="size-4" />
              {network.name}
            </motion.span>
          </AnimatePresence>
        </span>
        {aside}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">{amount}</div>
        {token}
      </div>
      <div className="mt-2 flex min-h-6 items-center justify-between gap-3 text-xs text-muted-foreground tabular-nums">
        {footer}
      </div>
      {children}
    </div>
  );
}
