"use client";

import { ArrowUp, Bot, Globe2, Mic, Paperclip } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/beui/utils";

type TypingPhase = "idle" | "typing" | "holding" | "deleting";

export type AiComposerLayout = "default" | "card";

export type AiComposerProps = {
  className?: string;
  layout?: AiComposerLayout;
  prompt?: string;
  title?: string;
};

export function AiComposer({
  className,
  layout = "default",
  prompt = "Research the latest AI agent frameworks",
  title = "An AI composer types a research request with web search enabled",
}: AiComposerProps) {
  const reduce = useReducedMotion();
  const [displayedPrompt, setDisplayedPrompt] = useState("");
  const [typingPhase, setTypingPhase] = useState<TypingPhase>("idle");

  useEffect(() => {
    let timer: number | undefined;
    let characterIndex = 0;

    if (reduce) {
      setDisplayedPrompt(prompt);
      setTypingPhase("holding");
      return;
    }

    const deleteCharacter = () => {
      characterIndex -= 1;
      setDisplayedPrompt(prompt.slice(0, characterIndex));

      if (characterIndex > 0) {
        timer = window.setTimeout(deleteCharacter, 24);
        return;
      }

      setTypingPhase("idle");
      timer = window.setTimeout(startTyping, 720);
    };

    const typeCharacter = () => {
      characterIndex += 1;
      setDisplayedPrompt(prompt.slice(0, characterIndex));

      if (characterIndex < prompt.length) {
        timer = window.setTimeout(typeCharacter, 46);
        return;
      }

      setTypingPhase("holding");
      timer = window.setTimeout(() => {
        setTypingPhase("deleting");
        deleteCharacter();
      }, 2200);
    };

    function startTyping() {
      characterIndex = 0;
      setDisplayedPrompt("");
      setTypingPhase("typing");
      timer = window.setTimeout(typeCharacter, 180);
    }

    setDisplayedPrompt("");
    setTypingPhase("idle");
    timer = window.setTimeout(startTyping, 900);

    return () => window.clearTimeout(timer);
  }, [prompt, reduce]);

  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "ai-composer relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground [container-type:inline-size]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute start-[10cqw] top-[38%] w-[128cqw] overflow-hidden rounded-[clamp(1.5rem,5cqw,2.25rem)] bg-[oklch(0.88_0.05_246)] p-[3px] dark:bg-[oklch(0.39_0.07_246)]"
      >
        <div className="rounded-[calc(clamp(1.5rem,5cqw,2.25rem)-3px)] bg-background px-[clamp(0.75rem,3.2cqw,1.25rem)] pt-[clamp(1rem,4cqw,1.5rem)] pb-[clamp(0.75rem,2.5cqw,1rem)]">
          <div className="px-[clamp(0.25rem,1cqw,0.5rem)]">
            <div
              className={cn(
                "relative overflow-hidden font-medium tracking-[-0.025em]",
                layout === "card"
                  ? "min-h-[clamp(2.5rem,8.5cqw,3rem)] text-[clamp(0.7rem,2.8cqw,0.875rem)]"
                  : "min-h-[clamp(3rem,10cqw,3.5rem)] text-[clamp(0.8rem,3cqw,1.125rem)]",
              )}
            >
              {typingPhase === "idle" ? (
                <span className="absolute inset-inline-start-0 top-0 text-muted-foreground/70">
                  Message your AI assistant
                </span>
              ) : (
                <span className="absolute inset-inline-start-0 top-0 max-w-full whitespace-nowrap">
                  {displayedPrompt}
                  {!reduce ? (
                    <span className="ai-composer__caret ms-[0.12em] inline-block h-[1.06em] w-px translate-y-[0.13em] bg-foreground" />
                  ) : null}
                </span>
              )}
            </div>
          </div>

          <div className="flex w-[80cqw] items-center gap-[clamp(0.125rem,0.8cqw,0.25rem)] text-muted-foreground">
            <span
              className={cn(
                "grid shrink-0 place-items-center rounded-full",
                layout === "card"
                  ? "size-[clamp(1.75rem,7cqw,2rem)]"
                  : "size-[clamp(2rem,7.5cqw,2.25rem)]",
              )}
            >
              <Paperclip
                className="size-[clamp(0.875rem,3.6cqw,1.125rem)]"
                strokeWidth={1.8}
              />
            </span>

            <span
              className={cn(
                "grid shrink-0 place-items-center rounded-full",
                layout === "card"
                  ? "size-[clamp(1.75rem,7cqw,2rem)]"
                  : "size-[clamp(2rem,7.5cqw,2.25rem)]",
              )}
            >
              <Mic
                className="size-[clamp(0.875rem,3.6cqw,1.125rem)]"
                strokeWidth={1.8}
              />
            </span>

            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full bg-(--search-bg) font-medium text-(--search-fg) [--search-bg:oklch(0.941_0.03_246.59)] [--search-fg:oklch(0.51_0.158_254.175)] dark:[--search-bg:oklch(0.307_0.056_245.969)] dark:[--search-fg:oklch(0.769_0.124_248.136)]",
                layout === "card"
                  ? "h-[clamp(1.75rem,7cqw,2rem)] gap-1.5 px-[clamp(0.5rem,2cqw,0.75rem)] text-[clamp(0.625rem,2.4cqw,0.75rem)]"
                  : "h-[clamp(2rem,7.5cqw,2.25rem)] gap-1.5 px-[clamp(0.625rem,2.4cqw,0.875rem)] text-[clamp(0.675rem,2.6cqw,0.8rem)]",
              )}
            >
              <Globe2
                className="size-[clamp(0.875rem,3.4cqw,1rem)]"
                strokeWidth={1.8}
              />
              Search
            </span>

            <span className="ms-1 grid size-[clamp(1.75rem,7cqw,2rem)] shrink-0 place-items-center rounded-full text-foreground">
              <Bot className="size-[clamp(0.875rem,3.5cqw,1rem)]" />
            </span>

            <span
              className={cn(
                "ms-auto grid shrink-0 place-items-center rounded-full bg-[oklch(0.58_0.18_250)] text-[oklch(0.98_0_0)] dark:bg-[oklch(0.64_0.16_250)]",
                layout === "card"
                  ? "size-[clamp(1.75rem,7cqw,2rem)]"
                  : "size-[clamp(2rem,7.5cqw,2.25rem)]",
              )}
            >
              <ArrowUp
                className="size-[clamp(0.875rem,3.6cqw,1.125rem)]"
                strokeWidth={2.2}
              />
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .ai-composer__caret {
          animation: ai-composer-caret 800ms steps(1, end) infinite;
        }

        @keyframes ai-composer-caret {
          0%,
          48% {
            opacity: 1;
          }
          49%,
          100% {
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ai-composer__caret {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
