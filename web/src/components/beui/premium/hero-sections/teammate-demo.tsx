"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCheck,
  FileText,
  FolderOpen,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { AiHeroTeammate } from "./ai-teammates-data";
import { TeammateAvatar } from "./teammate-avatar";

export function TeammateDemo({
  teammate,
  teammates,
  teamName,
  runId,
  started,
  onStart,
  onReplay,
  onSelect,
  onOpenDocument,
}: {
  teammate: AiHeroTeammate;
  teammates: readonly AiHeroTeammate[];
  teamName: string;
  runId: number;
  started: boolean;
  onStart: () => void;
  onReplay: () => void;
  onSelect: (id: string) => void;
  onOpenDocument: () => void;
}) {
  const reduce = useReducedMotion();
  const threadRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const previousRun = useRef(runId);
  const headingId = useId();
  const taskHintId = useId();
  const inView = useInView(threadRef, { amount: 0.45 });
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState({ runId, stage: 0, paused: false });
  const [pageVisible, setPageVisible] = useState(true);
  const [showLatest, setShowLatest] = useState(false);
  const { stage, paused } =
    progress.runId === runId ? progress : { stage: 0, paused: false };
  const currentStage = reduce && started ? 3 : stage;
  const complete = currentStage === 3;
  const moving =
    started && !paused && !complete && inView && pageVisible && !reduce;
  const status = complete
    ? "Ready for review"
    : !started
      ? "Ready to help"
      : paused
        ? "Paused"
        : "Working on it";
  const filtered = teammates.filter((item) =>
    `${item.name} ${item.role} ${item.detail}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (reduce || !started || paused || !inView || !pageVisible || stage === 3)
      return;
    const timer = window.setTimeout(
      () => setProgress({ runId, stage: stage + 1, paused: false }),
      stage === 2 ? 2200 : 1800,
    );
    return () => window.clearTimeout(timer);
  }, [inView, pageVisible, paused, reduce, runId, stage, started]);

  useEffect(() => {
    if (previousRun.current !== runId) {
      previousRun.current = runId;
      followLatest.current = true;
    }
    const content = contentRef.current;
    if (!content) return;
    let frame = 0;
    // Follow actual message growth, including wrapping. Reading older messages stops following.
    const followContent = () => {
      if (!followLatest.current) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const thread = threadRef.current;
        if (thread) thread.scrollTop = thread.scrollHeight;
        setShowLatest(false);
      });
    };
    const observer = new ResizeObserver(followContent);
    observer.observe(content);
    followContent();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [runId]);

  function togglePlayback() {
    if (complete) {
      onReplay();
      return;
    }
    if (!started) onStart();
    setProgress({ runId, stage, paused: started ? !paused : false });
  }

  const messageMotion = {
    initial: reduce ? (false as const) : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.35, ease: EASE_OUT },
  };

  return (
    <div className="flex min-w-0 flex-col md:flex-row">
      <aside className="border-border border-b md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-b-0 lg:w-64">
        <div className="flex h-16 items-center justify-between gap-3 border-border border-b px-5">
          <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <TeammateAvatar variant="ink" className="size-7" />
            <span className="truncate">{teamName}</span>
          </p>
          <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
            Demo
          </span>
        </div>
        <div className="px-4 pt-3 md:pt-5">
          <Input
            aria-label="Find a demo teammate"
            placeholder="Find a teammate"
            leftIcon={<Search aria-hidden />}
            value={query}
            onChange={setQuery}
          />
          <p className="mt-6 mb-3 hidden px-2 text-xs text-muted-foreground md:block">
            YOUR TEAM
          </p>
        </div>
        <nav
          aria-label="Demo teammates"
          className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible md:pt-0"
        >
          {filtered.map((item) => {
            const selected = teammate.id === item.id;
            return (
              <Button
                key={item.id}
                variant="plain"
                aria-label={`Open ${item.name} conversation`}
                aria-pressed={selected}
                onClick={() => onSelect(item.id)}
                className="shrink-0 text-left"
              >
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border px-2.5 py-2.5 md:gap-2.5 md:px-3 md:py-3",
                    selected ? "border-border" : "border-transparent",
                  )}
                >
                  <TeammateAvatar
                    variant={item.avatar}
                    className="size-6 md:size-9"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-xs font-medium md:text-sm">
                      {item.name}
                      {selected && (
                        <span
                          aria-hidden
                          className="hidden size-1.5 rounded-full bg-foreground md:block"
                        />
                      )}
                    </span>
                    <span className="mt-1 hidden truncate text-xs text-muted-foreground md:block">
                      {item.role}
                    </span>
                    <span className="mt-1 hidden truncate text-xs text-muted-foreground md:block">
                      {selected ? status : item.detail}
                    </span>
                  </span>
                </span>
              </Button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              No matching teammates.
            </p>
          )}
        </nav>
        <div className="mx-5 mt-auto hidden items-center gap-2.5 border-border border-t py-5 md:flex">
          <span className="grid size-8 place-items-center rounded-full border border-border text-xs font-medium">
            JD
          </span>
          <div>
            <p className="text-xs font-medium">Jamie Daniels</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You and your team
            </p>
          </div>
        </div>
      </aside>

      <section aria-labelledby={headingId} className="min-w-0 flex-1">
        <div className="flex h-16 items-center justify-between gap-3 border-border border-b px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <TeammateAvatar variant={teammate.avatar} className="size-8" />
            <div className="min-w-0">
              <h2 id={headingId} className="truncate text-sm font-medium">
                {teammate.name}
              </h2>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {teammate.role}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                complete
                  ? "Play conversation again"
                  : !started || paused
                    ? "Play conversation"
                    : "Pause conversation"
              }
              className="relative after:absolute after:-inset-0.5"
              onClick={togglePlayback}
            >
              {!started || paused || complete ? (
                <Play aria-hidden className="size-3.5" />
              ) : (
                <Pause aria-hidden className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Replay conversation"
              className="relative after:absolute after:-inset-0.5"
              onClick={onReplay}
            >
              <RotateCcw aria-hidden className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <section
            ref={threadRef}
            aria-label={`Conversation with ${teammate.name}`}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable transcript needs keyboard focus for Page Up and Page Down.
            tabIndex={0}
            className="h-96 overflow-y-auto overscroll-contain px-4 py-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:h-[31rem] sm:px-6"
            onScroll={(event) => {
              const node = event.currentTarget;
              const nearEnd =
                node.scrollHeight - node.scrollTop - node.clientHeight < 64;
              followLatest.current = nearEnd;
              setShowLatest(!nearEnd);
            }}
          >
            <div
              ref={contentRef}
              key={runId}
              className="mx-auto max-w-2xl space-y-5"
            >
              <p className="text-center text-xs text-muted-foreground">
                Today · A little help from {teammate.name}
              </p>
              <div className="flex items-start gap-2.5">
                <TeammateAvatar
                  variant={teammate.avatar}
                  className="mt-1 size-7"
                />
                <div className="max-w-lg rounded-2xl border border-border px-4 py-3">
                  <p className="text-sm leading-6">{teammate.greeting}</p>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {started && (
                  <motion.div {...messageMotion} className="ml-auto max-w-lg">
                    <p className="mb-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      You <CheckCheck aria-hidden className="size-3" />
                    </p>
                    <div className="rounded-2xl bg-foreground px-4 py-3 text-background">
                      <p className="text-sm leading-6">{teammate.request}</p>
                    </div>
                    {teammate.sources?.length ? (
                      <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                        {teammate.sources.map((source) => (
                          <span
                            key={source}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-xs text-muted-foreground"
                          >
                            <FileText aria-hidden className="size-3" />
                            {source}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              {started && (
                <motion.div
                  {...messageMotion}
                  className="flex items-start gap-2.5"
                >
                  <TeammateAvatar
                    variant={teammate.avatar}
                    animated={moving}
                    className="mt-1 size-7"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-xs font-medium">{teammate.name}</p>
                    <div className="max-w-lg rounded-2xl border border-border px-4 py-3">
                      {teammate.acknowledgement && (
                        <p className="text-sm leading-6">
                          {teammate.acknowledgement}
                        </p>
                      )}
                      <ol
                        aria-label={`${teammate.name}’s task progress`}
                        className="mt-4 space-y-2.5"
                      >
                        {teammate.steps.map((step, index) => (
                          <li
                            key={step}
                            className={cn(
                              "flex items-start gap-2 text-xs leading-5",
                              index === currentStage
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-border">
                              {index < currentStage ? (
                                <Check aria-hidden className="size-2.5" />
                              ) : (
                                <motion.span
                                  aria-hidden
                                  className="size-1 rounded-full bg-current"
                                  animate={{
                                    opacity:
                                      moving && index === currentStage
                                        ? [0.35, 1, 0.35]
                                        : 1,
                                  }}
                                  transition={{
                                    duration: moving ? 1.2 : 0,
                                    repeat:
                                      moving && index === currentStage
                                        ? Infinity
                                        : 0,
                                    ease: EASE_OUT,
                                  }}
                                />
                              )}
                            </span>
                            <span>
                              {step}
                              <span className="sr-only">
                                {index < currentStage
                                  ? ", complete"
                                  : index === currentStage && !paused
                                    ? ", in progress"
                                    : ", pending"}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <AnimatePresence initial={false}>
                      {currentStage >= 2 && (
                        <motion.div
                          {...messageMotion}
                          className="mt-4 max-w-lg"
                        >
                          {complete && (
                            <p className="mb-3 text-sm leading-6 text-muted-foreground">
                              {teammate.result}
                            </p>
                          )}
                          <WorkPreview
                            teammate={teammate}
                            complete={complete}
                            onOpen={onOpenDocument}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </div>
          </section>
          {showLatest && (
            <Button
              variant="outline"
              className="absolute right-5 bottom-4 bg-background"
              onClick={() => {
                followLatest.current = true;
                if (threadRef.current)
                  threadRef.current.scrollTop = threadRef.current.scrollHeight;
                threadRef.current?.focus({ preventScroll: true });
                setShowLatest(false);
              }}
            >
              Latest message <ArrowDown aria-hidden className="size-3.5" />
            </Button>
          )}
        </div>

        <form
          className="border-border border-t px-4 py-4 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            onReplay();
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span id={taskHintId}>Sample task</span>
            <output aria-live="polite" className="flex items-center gap-1.5">
              {complete && <CheckCheck aria-hidden className="size-3" />}
              {status}
            </output>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={teammate.request}
              readOnly
              aria-label={`Sample task for ${teammate.name}`}
              aria-describedby={taskHintId}
              leftIcon={<MessageCircle aria-hidden />}
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              size="icon"
              aria-label={`Run ${teammate.name}’s sample task`}
              className="relative shrink-0 after:absolute after:-inset-0.5"
            >
              <ArrowUp aria-hidden className="size-4" />
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function WorkPreview({
  teammate,
  complete,
  onOpen,
}: {
  teammate: AiHeroTeammate;
  complete: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-border border-b px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <FolderOpen aria-hidden className="size-3.5" />
          Work preview
        </span>
        <span>{complete ? "Finished brief" : "Putting it together"}</span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText aria-hidden className="size-3.5" />
          Prepared by {teammate.name}
        </div>
        <h3 className="text-xl font-medium">{teammate.document.name}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {teammate.document.summary}
        </p>
        <div className="mt-5 space-y-3">
          {teammate.document.sections.slice(0, 3).map((section, index) => (
            <div key={section.title} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border text-xs text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium">{section.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground sm:line-clamp-1">
                  {complete || index === 0
                    ? section.body
                    : index === 1
                      ? "Writing this section…"
                      : "Up next"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-t px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCheck aria-hidden className="size-3.5" />
          {complete ? "You have the final say" : "Draft in progress"}
        </span>
        <Button variant="outline" disabled={!complete} onClick={onOpen}>
          Review brief <ArrowUpRight aria-hidden className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
