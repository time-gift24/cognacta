"use client";

import {
  CalendarDays,
  Check,
  FileText,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const actions = ["Outline approved", "Owners assigned", "Timeline drafted"];
const responseWords =
  "I turned the brief into a launch plan with clear owners and a review timeline."
    .split(" ")
    .map((word, index) => ({ id: `response-word-${index + 1}`, word }));

const artifacts: { label: string; icon: LucideIcon }[] = [
  { label: "Brief", icon: FileText },
  { label: "Tasks", icon: ListChecks },
  { label: "Timeline", icon: CalendarDays },
];

export type ChatExchangeLayout = "default" | "card";

export type ChatExchangeProps = {
  className?: string;
  layout?: ChatExchangeLayout;
  title?: string;
};

export function ChatExchange({
  className,
  layout = "default",
  title = "A user request followed by assistant progress, a response, and generated artifacts",
}: ChatExchangeProps) {
  const reduce = useReducedMotion();
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reduce) return;

    const interval = window.setInterval(
      () => setCycle((current) => current + 1),
      5800,
    );

    return () => window.clearInterval(interval);
  }, [reduce]);

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: {
            opacity: 0,
            filter: "blur(4px)",
            transform: "translate3d(0, 10px, 0) scale(0.97)",
          },
          animate: {
            opacity: 1,
            filter: "blur(0px)",
            transform: "translate3d(0, 0, 0) scale(1)",
          },
          transition: { duration: 0.4, ease: EASE_OUT, delay },
        };

  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 flex flex-col justify-end",
          layout === "card" ? "gap-2 p-[6%]" : "gap-2.5 p-[10%]",
        )}
      >
        <motion.div
          key={cycle}
          className={cn(
            "flex flex-col",
            layout === "card" ? "gap-2" : "gap-2.5",
          )}
        >
          <motion.div
            initial={
              reduce
                ? false
                : {
                    opacity: 0,
                    clipPath: "inset(62% 0% 0% 88% round 999px)",
                    transform: "translate3d(4px, 6px, 0) scale(0.96)",
                  }
            }
            animate={{
              opacity: 1,
              clipPath: "inset(0% 0% 0% 0% round 16px 16px 4px 16px)",
              transform: "translate3d(0, 0, 0) scale(1)",
            }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.55, ease: EASE_OUT, delay: 0.1 }
            }
            style={{
              transformOrigin: "100% 100%",
              willChange: "transform, opacity, clip-path",
            }}
            className={cn(
              "self-end overflow-hidden rounded-2xl rounded-br-sm bg-[oklch(0.58_0.18_250)] font-medium text-[oklch(0.98_0_0)] dark:bg-[oklch(0.64_0.16_250)]",
              layout === "card"
                ? "max-w-[86%] px-2.5 py-1.5 text-[0.58rem] leading-[1.35]"
                : "max-w-[78%] px-3.5 py-2.5 text-xs leading-[1.45]",
            )}
          >
            Turn this launch brief into a clear plan.
          </motion.div>

          <div
            className={cn(
              "relative self-start",
              layout === "card" ? "min-h-24 w-[94%]" : "min-h-36 w-[88%]",
            )}
          >
            <motion.div
              initial={false}
              animate={
                reduce
                  ? { opacity: 0 }
                  : {
                      opacity: [0, 1, 1, 0],
                      filter: [
                        "blur(4px)",
                        "blur(0px)",
                        "blur(0px)",
                        "blur(2px)",
                      ],
                      transform: [
                        "translate3d(0, 5px, 0)",
                        "translate3d(0, 0, 0)",
                        "translate3d(0, 0, 0)",
                        "translate3d(0, -2px, 0)",
                      ],
                    }
              }
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      duration: 1.9,
                      ease: EASE_OUT,
                      delay: 0.48,
                      times: [0, 0.12, 0.84, 1],
                    }
              }
              className={cn(
                "absolute top-0 left-0 font-medium",
                layout === "card" ? "text-[0.56rem]" : "text-xs",
              )}
            >
              <span className="chat-exchange__shimmer">
                Thinking through the brief…
              </span>
            </motion.div>

            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.2, ease: EASE_OUT, delay: 2.26 }
              }
              className={cn(
                "font-medium text-muted-foreground uppercase tracking-[0.08em]",
                layout === "card"
                  ? "mb-1 text-[0.48rem]"
                  : "mb-1.5 text-[0.64rem]",
              )}
            >
              Assistant
            </motion.p>

            <p
              className={cn(
                layout === "card"
                  ? "text-[0.58rem] leading-[1.4]"
                  : "text-xs leading-[1.5]",
              )}
            >
              {responseWords.map((token, index) => (
                <motion.span
                  key={token.id}
                  initial={
                    reduce
                      ? false
                      : {
                          opacity: 0,
                          filter: "blur(3px)",
                          transform: "translate3d(0, 3px, 0)",
                        }
                  }
                  animate={{
                    opacity: 1,
                    filter: "blur(0px)",
                    transform: "translate3d(0, 0, 0)",
                  }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          duration: 0.22,
                          ease: EASE_OUT,
                          delay: 2.38 + index * 0.055,
                        }
                  }
                  className="inline-block"
                >
                  {token.word}&nbsp;
                </motion.span>
              ))}
            </p>

            <div
              className={cn(
                "flex flex-col",
                layout === "card" ? "mt-1.5 gap-1" : "mt-2.5 gap-1.5",
              )}
            >
              {actions.map((action, index) => (
                <motion.div
                  key={action}
                  initial={
                    reduce
                      ? false
                      : {
                          opacity: 0,
                          transform: "translate3d(0, 5px, 0)",
                        }
                  }
                  animate={{
                    opacity: 1,
                    transform: "translate3d(0, 0, 0)",
                  }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          duration: 0.3,
                          ease: EASE_OUT,
                          delay: 3.35 + index * 0.18,
                        }
                  }
                  className={cn(
                    "flex items-center",
                    layout === "card"
                      ? "gap-1.5 text-[0.54rem]"
                      : "gap-2 text-[0.7rem]",
                  )}
                >
                  <span
                    className={cn(
                      "grid shrink-0 place-items-center rounded-full bg-[oklch(0.58_0.18_250)] text-[oklch(0.98_0_0)] dark:bg-[oklch(0.64_0.16_250)]",
                      layout === "card" ? "size-3" : "size-3.5",
                    )}
                  >
                    <Check
                      className={layout === "card" ? "size-1.5" : "size-2"}
                      strokeWidth={2.4}
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{action}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            {...rise(4.05)}
            className={cn(
              "flex flex-wrap",
              layout === "card" ? "gap-1" : "gap-1.5",
            )}
          >
            {artifacts.map((artifact) => {
              const Icon = artifact.icon;

              return (
                <span
                  key={artifact.label}
                  className={cn(
                    "inline-flex items-center rounded-lg border border-border bg-background/82 backdrop-blur-md",
                    layout === "card"
                      ? "gap-1 px-1.5 py-0.5 text-[0.5rem]"
                      : "gap-1.5 px-2 py-1 text-[0.64rem]",
                  )}
                >
                  <Icon
                    className={cn(
                      "text-muted-foreground",
                      layout === "card" ? "size-2" : "size-2.5",
                    )}
                    strokeWidth={1.8}
                  />
                  {artifact.label}
                </span>
              );
            })}
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        .chat-exchange__shimmer {
          color: transparent;
          background: linear-gradient(
            90deg,
            color-mix(in oklab, var(--muted-foreground) 32%, transparent) 0%,
            var(--foreground) 48%,
            color-mix(in oklab, var(--muted-foreground) 32%, transparent) 100%
          );
          background-size: 220% 100%;
          background-clip: text;
          animation: chat-exchange-shimmer 900ms linear infinite;
        }

        @keyframes chat-exchange-shimmer {
          from {
            background-position: 100% 0;
          }
          to {
            background-position: -120% 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .chat-exchange__shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
