"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/ease";
import { PresenceGate } from "@/lib/presence-gate";
import { ChevronRight, Folder, Plus } from "@/components/icons";
import { useSessions } from "./session-provider";
import { SessionRow } from "./sessions/session-row";

export function ProjectGroup({
  project,
  activeSessionId,
  onSelectSession,
}: {
  project: { id: string; title: string };
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
}) {
  const { sessions, createProjectSession } = useSessions();
  const t = useTranslations("Projects");
  const reduce = useReducedMotion();
  const children = sessions.filter(
    (session) => session.projectId === project.id && !session.archived,
  );
  const previousCount = useRef(children.length);
  const containsActive = children.some(
    (session) => session.id === activeSessionId,
  );
  const [expanded, setExpanded] = useState(containsActive);
  const listId = useId();
  useEffect(() => {
    if (children.length > previousCount.current) setExpanded(true);
    previousCount.current = children.length;
  }, [children.length]);
  useEffect(() => {
    if (containsActive) setExpanded(true);
  }, [containsActive, activeSessionId]);

  return (
    <motion.div
      layout={reduce ? false : "position"}
      transition={{ duration: 0.2, ease: EASE_OUT }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
        className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-muted-foreground hover:bg-surface-active hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Folder className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{project.title}</span>
        <ChevronRight
          className={`size-3 shrink-0 transition-transform motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      <div id={listId}>
        <AnimatePresence initial={false}>
          {expanded ? (
            <PresenceGate key="sessions">
              {({ gate }) => (
                <motion.div
                  {...gate}
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.1, ease: EASE_OUT },
                  }}
                  transition={{ duration: 0.15, ease: EASE_OUT }}
                  className="ml-4 space-y-0.5 py-1"
                >
                  {children.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      active={session.id === activeSessionId}
                      onNavigate={() => onSelectSession(session.id)}
                    />
                  ))}
                  <button
                    type="button"
                    aria-label={t("newChatIn", { project: project.title })}
                    onClick={() => {
                      const id = createProjectSession(project.id);
                      if (id) onSelectSession(id);
                    }}
                    className="flex h-8 w-full items-center gap-2 rounded-md px-3 text-xs text-muted-foreground hover:bg-surface-active hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <Plus className="size-3.5" /> {t("newChat")}
                  </button>
                </motion.div>
              )}
            </PresenceGate>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
