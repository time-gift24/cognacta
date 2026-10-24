"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  TeammateAvatar,
  type TeammateAvatarVariant,
} from "../hero-sections/teammate-avatar";
import type { CryptoAgentMessage } from "./crypto-agent-data";
import { CryptoAgentSteps } from "./crypto-agent-steps";

/** Seconds per word when an agent reply streams in. */
export const AGENT_WORD_STAGGER = 0.022;

/** The agent's character: a soft blob that blinks while it's on screen. */
export function CryptoAgentAvatar({
  variant = "mint",
  className,
}: {
  variant?: TeammateAvatarVariant;
  className?: string;
}) {
  return (
    <TeammateAvatar
      variant={variant}
      animated
      className={cn("size-7", className)}
    />
  );
}

export function CryptoAgentUserBubble({ text }: { text: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground"
    >
      {text}
    </motion.div>
  );
}

/** Agent text that streams in word by word on first render. */
function StreamedText({ text, stream }: { text: string; stream: boolean }) {
  const reduce = useReducedMotion();
  if (!stream || reduce)
    return <p className="text-sm leading-relaxed text-foreground">{text}</p>;
  const words = text.split(" ");
  return (
    <p className="text-sm leading-relaxed text-foreground">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: Words repeat; position is the identity.
            key={index}
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{
              duration: 0.3,
              ease: EASE_OUT,
              delay: index * AGENT_WORD_STAGGER,
            }}
          >
            {word}
            {index < words.length - 1 ? " " : ""}
          </motion.span>
        ))}
      </span>
    </p>
  );
}

function ThinkingDots({ label }: { label: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="flex h-7 items-center gap-1 text-sm text-muted-foreground">
      {label}
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          aria-hidden="true"
          className="size-1 rounded-full bg-muted-foreground"
          animate={
            reduce ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -2, 0] }
          }
          transition={{
            duration: 0.9,
            repeat: Number.POSITIVE_INFINITY,
            delay: dot * 0.15,
          }}
        />
      ))}
    </span>
  );
}

/** Holds content back until the reply above it has finished streaming. */
function MountAfter({
  delay,
  children,
}: {
  delay: number;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(delay <= 0);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setReady(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay, ready]);
  return ready ? children : null;
}

/**
 * One agent turn: tool steps resolve first, then the reply streams in, then
 * the transaction card mounts once the last word lands.
 */
export function CryptoAgentReplyRow({
  message,
  stream,
  thinkingLabel,
  card,
}: {
  message: Extract<CryptoAgentMessage, { role: "agent" }>;
  stream: boolean;
  thinkingLabel: string;
  card?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const cardDelay =
    stream && !reduce
      ? message.text.split(" ").length * AGENT_WORD_STAGGER + 0.15
      : 0;
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="flex min-w-0 gap-3"
    >
      <CryptoAgentAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
        {message.working && !message.steps?.length ? (
          <ThinkingDots label={thinkingLabel} />
        ) : null}
        <CryptoAgentSteps steps={message.steps} />
        {message.text ? (
          <StreamedText text={message.text} stream={stream} />
        ) : null}
        {card && !message.working ? (
          <MountAfter delay={cardDelay}>{card}</MountAfter>
        ) : null}
      </div>
    </motion.div>
  );
}
