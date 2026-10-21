"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { ShaderBackground } from "@/components/beui/motion/shader-background";
import { EASE_OUT_CSS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { FaqItem } from "./faq-data";

const AI_FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: "model-choice",
    question: "Which AI models can I use?",
    answer:
      "Start with hosted models or connect your preferred provider. Model routing stays configurable, so the underlying workflow does not need to be rebuilt when requirements change.",
    category: "Getting started",
  },
  {
    id: "private-data",
    question: "Can AI work with private company data?",
    answer:
      "Yes. Connect approved sources through retrieval and permission-aware tools, while keeping access scoped to the people and agents that need it.",
    category: "Privacy",
  },
  {
    id: "agent-tools",
    question: "How do agents connect to tools?",
    answer:
      "Agents can call APIs, databases, and internal services through explicit tool definitions. Each connection can use its own credentials, limits, and approval rules.",
    category: "Support",
  },
  {
    id: "first-workflow",
    question: "Can I start with one workflow?",
    answer:
      "Yes. Begin with one narrow, measurable task, review its outputs with the team, and expand only after the workflow proves useful.",
    category: "Getting started",
  },
  {
    id: "observability",
    question: "How can I monitor quality and cost?",
    answer:
      "Use traces, evaluations, latency, token usage, and cost limits to understand every run. Failed steps remain visible instead of disappearing inside a black box.",
    category: "Support",
  },
];

export type FaqAiWorkspaceProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  supportTitle?: string;
  supportDescription?: string;
  supportLabel?: string;
  supportHref?: string;
  items?: readonly FaqItem[];
  defaultOpenId?: string | null;
  className?: string;
};

export function FaqAiWorkspace({
  eyebrow = "AI workspace FAQ",
  title = "Build with AI, without the guesswork",
  description = "Models, private data, agent tools, and what your team controls from day one.",
  supportTitle = "Planning an AI workflow?",
  supportDescription = "Share the use case, current stack, and constraints to identify the best place to start.",
  supportLabel = "Review your AI plan",
  supportHref = "#contact",
  items = AI_FAQ_ITEMS,
  defaultOpenId = items[0]?.id ?? null,
  className,
}: FaqAiWorkspaceProps) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-16 font-sans text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        <header className="mx-auto max-w-xl text-center">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            {eyebrow}
          </p>
          <h2 className="mt-5 text-balance font-medium text-4xl leading-none tracking-tight">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-md text-pretty text-muted-foreground text-sm leading-6 sm:text-base">
            {description}
          </p>
        </header>

        <div className="relative mt-12 isolate overflow-hidden rounded-3xl border border-border/60 p-4 sm:p-6 lg:p-8">
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <ShaderBackground
              variant="dithering"
              colorBack="#0f766e"
              colorFront="#fb923c"
              shape="wave"
              type="4x4"
              size={3}
              scale={1.15}
              speed={0.12}
              className="absolute inset-0 size-full"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-background/15 backdrop-saturate-150 dark:bg-background/30"
          />

          <div className="grid items-start gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:gap-5">
            <aside className="rounded-3xl border border-border/60 bg-background/80 p-6 backdrop-blur-2xl backdrop-saturate-150 sm:p-7">
              <p className="font-medium text-xl">{supportTitle}</p>
              <p className="mt-3 max-w-sm text-pretty text-muted-foreground text-sm leading-6">
                {supportDescription}
              </p>
              <ButtonLink href={supportHref} className="mt-6 rounded-full h-9">
                {supportLabel}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </ButtonLink>
            </aside>

            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const open = openId === item.id;
                const triggerId = `${baseId}-${item.id}-trigger`;
                const contentId = `${baseId}-${item.id}-content`;

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-3xl border border-border/60 bg-background/80 backdrop-blur-2xl backdrop-saturate-150"
                  >
                    <div
                      className={cn(
                        "group relative flex min-h-20 w-full items-start gap-4 px-5 py-5 text-left has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ring sm:px-6",
                        open ? "rounded-t-3xl" : "rounded-3xl",
                      )}
                    >
                      <span className="min-w-0 flex-1 font-medium text-xl leading-7">
                        {item.question}
                      </span>
                      <span
                        aria-hidden="true"
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground"
                      >
                        <Plus
                          style={{ transitionTimingFunction: EASE_OUT_CSS }}
                          className={cn(
                            "size-4 transition-transform duration-200 motion-reduce:transition-none",
                            open && "rotate-45",
                          )}
                        />
                      </span>
                      {/* Full-header control; the shared Button is always pill-shaped, so the
                          header keeps its own radius and this sits on top. */}
                      <Button
                        variant="plain"
                        type="button"
                        id={triggerId}
                        aria-label={item.question}
                        aria-expanded={open}
                        aria-controls={contentId}
                        onClick={() => setOpenId(open ? null : item.id)}
                        whileHover={undefined}
                        whileTap={undefined}
                        className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <section
                      id={contentId}
                      aria-labelledby={triggerId}
                      aria-hidden={!open}
                      style={{ transitionTimingFunction: EASE_OUT_CSS }}
                      className={cn(
                        "grid overflow-hidden transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <p
                          style={{ transitionTimingFunction: EASE_OUT_CSS }}
                          className={cn(
                            "pr-6 pb-6 pl-5 text-pretty text-muted-foreground text-sm leading-6 transition-[opacity,transform] duration-200 motion-reduce:transition-none sm:pr-16 sm:pl-6",
                            open
                              ? "translate-y-0 opacity-100"
                              : "-translate-y-1 opacity-0",
                          )}
                        >
                          {item.answer}
                        </p>
                      </div>
                    </section>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
