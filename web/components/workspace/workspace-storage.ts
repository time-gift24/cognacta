import type { MessageContext, Project, Session } from "./types";

export const WORKSPACE_KEY = "cognacta.workspace.v2";

export type WorkspaceSeeds = {
  sessions: Session[];
  projects: Project[];
};

function isContext(value: unknown): value is MessageContext {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MessageContext>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    (item.kind === "file" || item.kind === "knowledge") &&
    (item.content === undefined || typeof item.content === "string") &&
    (item.url === undefined || typeof item.url === "string")
  );
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<Session>;
  return (
    typeof session.id === "string" &&
    typeof session.title === "string" &&
    typeof session.archived === "boolean" &&
    (session.projectId === undefined ||
      typeof session.projectId === "string") &&
    Array.isArray(session.messages) &&
    session.messages.every(
      (message) =>
        message &&
        typeof message.id === "number" &&
        typeof message.content === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        (message.context === undefined ||
          (Array.isArray(message.context) && message.context.every(isContext))),
    )
  );
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<Project>;
  return typeof project.id === "string" && typeof project.title === "string";
}

export function readWorkspace(
  storage: Storage,
  seeds: WorkspaceSeeds,
): WorkspaceSeeds {
  const stored = storage.getItem(WORKSPACE_KEY);
  if (!stored) return seeds;

  const data = JSON.parse(stored);
  const sessions: unknown = data?.sessions;
  const projects: unknown = data?.projects;

  if (
    !Array.isArray(sessions) ||
    !sessions.every(isSession) ||
    !Array.isArray(projects) ||
    !projects.every(isProject)
  )
    throw new Error("Invalid workspace data");
  if (
    new Set(sessions.map((item) => item.id)).size !== sessions.length ||
    new Set(projects.map((item) => item.id)).size !== projects.length
  )
    throw new Error("Duplicate workspace IDs");

  return {
    projects,
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      messages: session.messages,
      archived: session.archived,
      projectId: projects.some(
        (project) => project.id === session.projectId,
      )
        ? session.projectId
        : undefined,
    })),
  };
}
