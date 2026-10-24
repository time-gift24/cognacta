"use client";

import {
  Check,
  KeyRound,
  type LucideIcon,
  Monitor,
  Server,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE_IN_OUT, SPRING_BOUNCE } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

/* ─────────────────────────────────────────────────────────
 * DELIVERY DIAGRAM
 *
 *  stage 0   event packet travels from your app to Fieldnote
 *  stage 1   Fieldnote lights up and a "Signed" badge pops
 *  stage 2   the packet continues to your endpoint
 *  stage 3   the endpoint lights up and "200 OK" travels back
 *  loop      restarts after a short rest, only while visible
 *  reduced   every node, badge, and label shows at rest
 * ───────────────────────────────────────────────────────── */
const STAGE_MS = [900, 700, 900, 1300] as const;

type DiagramNode = {
  label: string;
  detail: string;
  icon: LucideIcon;
};

const NODES: readonly DiagramNode[] = [
  { label: "Your app", detail: "note.published", icon: Monitor },
  { label: "Fieldnote", detail: "Signs and queues", icon: KeyRound },
  { label: "Your endpoint", detail: "POST /webhooks", icon: Server },
];

export function DocsDeliveryDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { margin: "-10% 0px" });
  const play = inView && !reduce;
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!play) return;
    const timer = setTimeout(
      () => setStage((current) => (current + 1) % STAGE_MS.length),
      STAGE_MS[stage],
    );
    return () => clearTimeout(timer);
  }, [play, stage]);

  const lit = (index: number) =>
    !!reduce || (index === 1 && stage >= 1) || (index === 2 && stage === 3);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Your app sends an event to Fieldnote, which signs it and delivers it to your endpoint. Your endpoint replies with 200 OK."
      className="relative overflow-hidden rounded-2xl border border-border bg-background p-5 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px]"
      />
      <div className="relative flex flex-col items-stretch pt-2 sm:flex-row sm:items-center">
        {NODES.map((node, index) => (
          <div key={node.label} className="contents">
            {index > 0 ? (
              <Connector
                active={play && stage === (index === 1 ? 0 : 2)}
                returning={play && index === 2 && stage === 3}
                reduce={reduce}
              />
            ) : null}
            <NodeCard
              node={node}
              lit={lit(index)}
              badge={
                index === 1
                  ? { show: !!reduce || stage >= 1, text: "Signed" }
                  : index === 2
                    ? { show: !!reduce || stage === 3, text: "200 OK" }
                    : null
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeCard({
  node,
  lit,
  badge,
}: {
  node: DiagramNode;
  lit: boolean;
  badge: { show: boolean; text: string } | null;
}) {
  const Icon = node.icon;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-2xl border bg-background p-3 transition-colors duration-300 sm:w-44 sm:flex-col sm:items-start",
        lit ? "border-foreground/40" : "border-border",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full bg-muted transition-colors duration-300",
          lit ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-foreground text-sm">
          {node.label}
        </span>
        <span className="block truncate font-mono text-muted-foreground text-xs">
          {node.detail}
        </span>
      </span>
      {badge ? (
        <AnimatePresence initial={false}>
          {badge.show ? (
            <motion.span
              key={badge.text}
              initial={{ opacity: 0, scale: 0.6, y: 4 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: SPRING_BOUNCE,
              }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-medium text-foreground text-xs"
            >
              <Check className="size-3" aria-hidden="true" />
              {badge.text}
            </motion.span>
          ) : null}
        </AnimatePresence>
      ) : null}
    </div>
  );
}

const TRAVEL = { duration: 0.85, ease: EASE_IN_OUT };

function Connector({
  active,
  returning,
  reduce,
}: {
  active: boolean;
  returning: boolean;
  reduce: boolean | null;
}) {
  return (
    <div className="relative mx-auto h-10 w-px sm:mx-0 sm:h-px sm:w-auto sm:flex-1">
      <span className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,var(--color-foreground)_0_4px,transparent_4px_9px)] opacity-25 sm:bg-[repeating-linear-gradient(to_right,var(--color-foreground)_0_4px,transparent_4px_9px)]" />
      {reduce ? null : (
        <>
          <AnimatePresence>
            {active ? (
              <motion.span
                key="out-x"
                initial={{ left: "0%", opacity: 0 }}
                animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={TRAVEL}
                className="absolute top-1/2 hidden size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground sm:block"
              />
            ) : null}
            {returning ? (
              <motion.span
                key="back-x"
                initial={{ left: "100%", opacity: 0 }}
                animate={{ left: "0%", opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ ...TRAVEL, delay: 0.25 }}
                className="absolute top-1/2 hidden size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background sm:block"
              />
            ) : null}
          </AnimatePresence>
          {/* Vertical packets for the stacked layout. */}
          <AnimatePresence>
            {active ? (
              <motion.span
                key="out-y"
                initial={{ top: "0%", opacity: 0 }}
                animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={TRAVEL}
                className="absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground sm:hidden"
              />
            ) : null}
            {returning ? (
              <motion.span
                key="back-y"
                initial={{ top: "100%", opacity: 0 }}
                animate={{ top: "0%", opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ ...TRAVEL, delay: 0.25 }}
                className="absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background sm:hidden"
              />
            ) : null}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
