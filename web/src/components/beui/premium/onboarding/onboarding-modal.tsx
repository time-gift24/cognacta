"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  KeyRound,
  type LucideIcon,
  Mail,
  PackagePlus,
  Rocket,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_BOUNCE } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

type Task = { id: string; icon: LucideIcon; title: string; body: string };

const TASKS: Task[] = [
  {
    id: "verify",
    icon: Mail,
    title: "Verify your email",
    body: "Secure your account.",
  },
  {
    id: "workspace",
    icon: PackagePlus,
    title: "Create your workspace",
    body: "Name it and pick a plan.",
  },
  {
    id: "token",
    icon: KeyRound,
    title: "Grab your registry token",
    body: "Needed to install components.",
  },
  {
    id: "invite",
    icon: Users,
    title: "Invite a teammate",
    body: "Better together.",
  },
];

export type OnboardingModalProps = {
  className?: string;
};

export function OnboardingModal({ className }: OnboardingModalProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string[]>(["verify"]);

  const total = TASKS.length;
  const count = done.length;
  const value = count / total;
  const allDone = count === total;

  const toggle = (id: string) =>
    setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <div
      className={cn(
        "grid min-h-[28rem] w-full place-items-center px-4 py-16",
        className,
      )}
    >
      {/* Keep the trigger mounted so focus returns here after closing. */}
      <Button
        variant="plain"
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-md items-center gap-4 rounded-full border border-border p-2.5 text-left"
      >
        <motion.span
          layout="position"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground"
        >
          <Rocket className="size-5" />
        </motion.span>
        <motion.div layout="position" className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">
            {allDone ? "You're all set up" : "Finish onboarding"}
          </p>
          <p className="truncate text-muted-foreground text-xs">
            {allDone
              ? "Everything's done — nice work."
              : `${count} of ${total} steps complete`}
          </p>
        </motion.div>
        <motion.span layout="position">
          <Ring value={value} size={40} reduce={reduce} />
        </motion.span>
      </Button>

      <AnimatedModal
        open={open}
        onOpenChange={setOpen}
        panelClassName="max-w-md rounded-3xl border border-border"
      >
        <motion.div
          layout="position"
          initial={reduce ? false : { opacity: 0, filter: "blur(6px)" }}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            transition: reduce
              ? { duration: 0 }
              : { delay: 0.1, duration: 0.3, ease: EASE_OUT },
          }}
          exit={
            reduce
              ? undefined
              : {
                  opacity: 0,
                  filter: "blur(6px)",
                  transition: { duration: 0.12, ease: EASE_OUT },
                }
          }
          className="p-4 sm:p-5"
        >
          {/* Header. */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Ring value={value} size={48} reduce={reduce} />
              <div>
                <AnimatedModalTitle className="font-medium text-foreground text-xl">
                  Finish setting up
                </AnimatedModalTitle>
                <AnimatedModalDescription className="text-muted-foreground text-sm">
                  {count} of {total} steps complete
                </AnimatedModalDescription>
              </div>
            </div>
            <Button
              variant="plain"
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="grid size-8 shrink-0 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Tasks. */}
          <div className="mt-5 flex flex-col gap-2">
            {TASKS.map((task) => {
              const complete = done.includes(task.id);
              return (
                <div
                  key={task.id}
                  className="relative flex items-center gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full border transition-colors",
                      complete
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {complete ? (
                        <motion.span
                          key="c"
                          initial={reduce ? false : { scale: 0.4 }}
                          animate={{ scale: 1 }}
                          transition={reduce ? { duration: 0 } : SPRING_BOUNCE}
                        >
                          <Check className="size-4" />
                        </motion.span>
                      ) : (
                        <task.icon className="size-4" />
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block font-medium text-sm",
                        complete
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="block truncate text-muted-foreground text-xs">
                      {task.body}
                    </span>
                  </span>
                  {complete ? null : (
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  {/* Full-row control; the shared Button is always pill-shaped, so the
                      row keeps its own radius and this sits on top. */}
                  <Button
                    variant="plain"
                    type="button"
                    aria-label={task.title}
                    aria-pressed={complete}
                    onClick={() => toggle(task.id)}
                    whileHover={undefined}
                    whileTap={undefined}
                    className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col items-center gap-2.5">
            <Button
              type="button"
              size="md"
              onClick={() => setOpen(false)}
              className="w-full rounded-full h-9"
            >
              {allDone ? "Go to dashboard" : "Continue setup"}
              <ArrowRight className="size-4" />
            </Button>
            {allDone ? null : (
              <Button
                variant="plain"
                type="button"
                onClick={() => setOpen(false)}
                className="font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
              >
                Maybe later
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatedModal>
    </div>
  );
}

function Ring({
  value,
  size,
  reduce,
}: {
  value: number;
  size: number;
  reduce: boolean | null;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`${Math.round(value * 100)}% complete`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-foreground/15"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={reduce ? { duration: 0 } : { ...SPRING_BOUNCE }}
          className="stroke-foreground"
        />
      </svg>
      <span className="absolute font-medium text-xs text-foreground tabular-nums">
        {Math.round(value * 100)}
      </span>
    </span>
  );
}
