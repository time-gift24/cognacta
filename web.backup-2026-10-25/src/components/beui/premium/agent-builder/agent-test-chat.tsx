"use client";

import { ArrowUp, Bot, RotateCcw, Square } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type {
  AgentConfiguration,
  AgentTestMessage,
  AgentTestRequest,
} from "./agent-builder-data";

export function AgentTestChat({
  configuration,
  onTest,
  demo = false,
}: {
  configuration: AgentConfiguration;
  onTest?: (request: AgentTestRequest) => Promise<string>;
  demo?: boolean;
}) {
  const [messages, setMessages] = useState<AgentTestMessage[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(" ");
  const controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  async function send(prompt = text, retry = false) {
    if (!prompt.trim() || controller.current || !onTest) return;
    const next: AgentTestMessage[] = retry
      ? messages
      : [...messages, { role: "user", content: prompt.trim() }];
    const requestController = new AbortController();
    controller.current = requestController;
    setMessages(next);
    setText("");
    setPending(true);
    setError(" ");
    try {
      const answer = await onTest({
        configuration: {
          ...configuration,
          sourceIds: [...configuration.sourceIds],
          toolIds: [...configuration.toolIds],
        },
        messages: next,
        signal: requestController.signal,
      });
      if (!requestController.signal.aborted) {
        if (!answer.trim()) throw Error("Empty response");
        setMessages([...next, { role: "assistant", content: answer }]);
      }
    } catch {
      if (!requestController.signal.aborted)
        setError("The test couldn’t finish. Try again.");
    } finally {
      if (controller.current === requestController) {
        controller.current = null;
        setPending(false);
      }
    }
  }
  function stop() {
    controller.current?.abort();
    controller.current = null;
    setPending(false);
  }
  useEffect(() => {
    if (messages.length || pending)
      log.current?.scrollTo({
        top: log.current.scrollHeight,
        behavior: "instant",
      });
  }, [messages, pending]);
  return (
    <section
      className="flex min-h-[32rem] flex-col rounded-2xl border border-border bg-background p-4 sm:p-5 lg:h-full"
      aria-label="Agent test chat"
    >
      <header className="flex items-center justify-between gap-3 px-1 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-muted">
            <Bot size={18} />
          </span>
          <div>
            <h3 className="text-xl font-medium">Test your agent</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {demo
                ? "Demo responses"
                : onTest
                  ? "Uses your current configuration"
                  : "Test connection not configured"}
            </p>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Reset test conversation"
          title="Reset conversation"
          onClick={() => {
            stop();
            setMessages([]);
            setError(" ");
          }}
          disabled={!messages.length && !pending}
          className="size-9 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
        >
          <RotateCcw size={15} />
        </Button>
      </header>
      <div
        ref={log}
        className="min-h-0 max-h-96 flex-1 space-y-5 overflow-y-auto px-1 py-5 lg:max-h-[32rem]"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {!messages.length && (
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-muted">
              <Bot size={24} />
            </span>
            <h3 className="text-xl font-medium">
              Meet {configuration.name || "your agent"}
            </h3>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Try a real question. Refine your instructions, then test again.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "What can you help me with?",
                "How do I invite a teammate?",
              ].map((prompt) => (
                <Button
                  key={prompt}
                  variant="ghost"
                  disabled={!onTest}
                  onClick={() => void send(prompt)}
                  className="bg-muted text-xs hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <motion.div
            key={`${index}-${message.role}`}
            initial={{ opacity: 0, y: reduce ? 0 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: EASE_OUT }}
            className={cn(
              "max-w-full",
              message.role === "user"
                ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-background px-4 py-2.5"
                : "mr-4",
            )}
          >
            {message.role === "assistant" ? (
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {configuration.name || "Agent"}
              </p>
            ) : (
              <span className="sr-only">You: </span>
            )}
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {message.content}
            </p>
          </motion.div>
        ))}
        {pending && (
          <p className="text-xs text-muted-foreground">Testing your agent…</p>
        )}
      </div>
      <div className="pt-4">
        {error && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
            <Button
              variant="ghost"
              className="text-xs rounded-full h-9"
              onClick={() => {
                const last = messages.at(-1);
                if (last?.role === "user") {
                  void send(last.content, true);
                }
              }}
            >
              Retry
            </Button>
          </div>
        )}
        <div className="rounded-2xl border border-border p-3 focus-within:ring-2 focus-within:ring-ring">
          <textarea
            aria-label="Test message"
            value={text}
            disabled={pending || !onTest}
            placeholder="Ask a test question…"
            rows={2}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void send();
              }
            }}
            className="block max-h-40 min-h-12 w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {configuration.sourceIds.length}{" "}
              {configuration.sourceIds.length === 1 ? "source" : "sources"} ·{" "}
              {configuration.toolIds.length}{" "}
              {configuration.toolIds.length === 1 ? "tool" : "tools"}
            </p>
            {pending ? (
              <Button
                variant="outline"
                size="icon"
                aria-label="Stop test"
                onClick={stop}
                className="size-9 rounded-full h-9"
              >
                <Square size={13} />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                aria-label="Send test message"
                onClick={() => void send()}
                disabled={!text.trim() || !onTest}
                className="size-9 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
              >
                <ArrowUp size={17} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
