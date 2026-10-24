"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { projectSeeds, recentSeeds, replyKeys } from "./config";
import type { Mode, Session, Project, MessageContext } from "./types";

import { readWorkspace, WORKSPACE_KEY } from "./workspace-storage";

function useSessionStore() {
  const router = useRouter();
  const tDemo = useTranslations("Demo");
  const seedProjects = useMemo<Project[]>(
    () =>
      projectSeeds.map((project) => ({
        id: project.id,
        title: tDemo(`projects.${project.key}`),
      })),
    [tDemo],
  );
  const seedSessions = useMemo<Session[]>(() => {
    const projectSessions = projectSeeds.map((project) => {
      const title = tDemo(`projects.${project.key}`);
      return {
        id: project.id,
        title,
        projectId: project.id,
        archived: false,
        messages: [
          { id: 1, role: "user" as const, content: title },
          {
            id: 2,
            role: "assistant" as const,
            content: tDemo("assistantIntro"),
          },
        ],
      };
    });
    const recentSessions = recentSeeds.map((thread) => {
      const title = tDemo(`recent.${thread.key}`);
      return {
        id: thread.id,
        title,
        archived: false,
        messages: [
          { id: 1, role: "user" as const, content: title },
          {
            id: 2,
            role: "assistant" as const,
            content: tDemo("assistantIntro"),
          },
        ],
      };
    });
    return [...projectSessions, ...recentSessions];
  }, [tDemo]);
  const replies = useMemo(
    () => replyKeys.map((key) => tDemo(`replies.${key}`)),
    [tDemo],
  );
  const [sessions, setSessions] = useState<Session[]>(seedSessions);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("chat");
  const [model, setModel] = useState("claude-sonnet-5");
  const [webEnabled, setWebEnabled] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const canPersist = useRef(true);
  const dirty = useRef(false);

  useEffect(() => {
    try {
      const saved = readWorkspace(localStorage, {
        sessions: seedSessions,
        projects: seedProjects,
      });
      setProjects(saved.projects);
      setSessions(saved.sessions);
    } catch {
      // Do not overwrite unreadable saved work with demo defaults.
      canPersist.current = false;
      setStorageError(true);
    }
    setReady(true);
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) clearTimeout(timer);
    };
    // The seed is read once; locale changes reload the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !canPersist.current || !dirty.current) return;
    try {
      localStorage.setItem(
        WORKSPACE_KEY,
        JSON.stringify({ sessions, projects }),
      );
    } catch {
      setStorageError(true);
    }
  }, [sessions, projects, ready]);

  function update(
    id: string,
    patch: Partial<Pick<Session, "title" | "archived">>,
  ) {
    dirty.current = true;
    setSessions((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function stop(id: string) {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setPending((items) => items.filter((item) => item !== id));
  }

  function moveToProject(sessionId: string, projectId: string | undefined) {
    if (
      !ready ||
      (projectId !== undefined &&
        !projects.some((project) => project.id === projectId))
    )
      return;
    dirty.current = true;
    setSessions((items) =>
      items.map((session) =>
        session.id === sessionId ? { ...session, projectId } : session,
      ),
    );
  }

  function createProject(title: string) {
    if (!ready || !title.trim()) return;
    const project = {
      id: crypto.randomUUID(),
      title: title.trim().slice(0, 80),
    };
    dirty.current = true;
    setProjects((items) => [...items, project]);
    return project.id;
  }

  function renameProject(id: string, title: string) {
    if (!ready || !title.trim()) return;
    dirty.current = true;
    setProjects((items) =>
      items.map((project) =>
        project.id === id
          ? { ...project, title: title.trim().slice(0, 80) }
          : project,
      ),
    );
  }

  function deleteProject(id: string) {
    if (!ready) return;
    dirty.current = true;
    // Keep chats and their stable URLs; only remove their project membership.
    setSessions((items) =>
      items.map((session) =>
        session.projectId === id
          ? { ...session, projectId: undefined }
          : session,
      ),
    );
    setProjects((items) => items.filter((project) => project.id !== id));
  }

  function remove(id: string) {
    stop(id);
    dirty.current = true;
    setSessions((items) => items.filter((item) => item.id !== id));
  }

  function createProjectSession(projectId: string) {
    if (!ready || !projects.some((project) => project.id === projectId)) return;
    const id = crypto.randomUUID();
    dirty.current = true;
    setSessions((items) => [
      {
        id,
        title: tDemo("newChatTitle"),
        projectId,
        messages: [],
        archived: false,
      },
      ...items,
    ]);
    return id;
  }

  function send(
    sessionId: string | undefined,
    text: string,
    context: MessageContext[] = [],
  ) {
    const content = text.trim();
    if (!content || !ready || (sessionId && timers.current.has(sessionId)))
      return;
    const id = sessionId ?? crypto.randomUUID();
    dirty.current = true;
    const message = { id: Date.now(), role: "user" as const, content, context };
    setSessions((items) =>
      sessionId
        ? items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  title:
                    item.messages.length === 0
                      ? content.slice(0, 48)
                      : item.title,
                  messages: [...item.messages, message],
                }
              : item,
          )
        : [
            {
              id,
              title: content.slice(0, 48),
              messages: [message],
              archived: false,
            },
            ...items,
          ],
    );
    setPending((items) => [...items, id]);
    timers.current.set(
      id,
      setTimeout(() => {
        setSessions((items) =>
          items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  messages: [
                    ...item.messages,
                    {
                      id: message.id + 1,
                      role: "assistant",
                      content: replies[message.id % replies.length],
                    },
                  ],
                }
              : item,
          ),
        );
        timers.current.delete(id);
        setPending((items) => items.filter((item) => item !== id));
      }, 950),
    );
    if (!sessionId) router.push(`/chat/${id}`);
  }

  return {
    sessions,
    projects,
    createProject,
    renameProject,
    deleteProject,
    ready,
    storageError,
    pending,
    update,
    remove,
    moveToProject,
    createProjectSession,
    send,
    stop,
    mode,
    setMode,
    model,
    setModel,
    webEnabled,
    setWebEnabled,
  };
}

const SessionContext = createContext<ReturnType<typeof useSessionStore> | null>(
  null,
);

export function SessionProvider({ children }: { children: ReactNode }) {
  const store = useSessionStore();
  return (
    <SessionContext.Provider value={store}>{children}</SessionContext.Provider>
  );
}

export function useSessions() {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error("useSessions must be used inside SessionProvider");
  return context;
}
