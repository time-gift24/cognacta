import type { Project, Session } from "./types";

/** One ordered result for rendering, announcements, and keyboard selection. */
export function searchSidebar<T extends { label: string; href: string }>({
  query,
  navItems,
  sessions,
  projects,
  pinned,
  pinnedIds,
  activeSessionId,
  openProjects,
}: {
  query: string;
  navItems: readonly T[];
  sessions: Session[];
  projects: Project[];
  pinned: Session[];
  pinnedIds: ReadonlySet<string>;
  activeSessionId: string | null;
  openProjects: Record<string, boolean>;
}) {
  const q = query.trim();
  const text = q.toLowerCase();
  const includes = (title: string) => title.toLowerCase().includes(text);
  const navMatches = navItems.filter((item) => includes(item.label));
  const pinnedMatches = pinned.filter((session) => includes(session.title));
  const projectRows = projects
    .map((project, index) => {
      const all = sessions.filter(
        (session) =>
          session.projectId === project.id &&
          !session.archived &&
          !pinnedIds.has(session.id),
      );
      const titleMatch = includes(project.title);
      const matches = titleMatch
        ? all
        : all.filter((session) => includes(session.title));
      return {
        project,
        index,
        sessions: matches,
        held: all.some((session) => session.id === activeSessionId),
        visible: titleMatch || matches.length > 0,
        expanded: q
          ? titleMatch || matches.length > 0
          : !!openProjects[project.id],
      };
    })
    .filter((row) => row.visible);
  const recentMatches = sessions.filter(
    (session) =>
      !session.projectId &&
      !session.archived &&
      !pinnedIds.has(session.id) &&
      includes(session.title),
  );
  const totalResults =
    navMatches.length +
    pinnedMatches.length +
    projectRows.reduce((count, row) => count + row.sessions.length + 1, 0) +
    recentMatches.length;
  const firstSession =
    pinnedMatches[0] ??
    projectRows.find((row) => row.sessions.length)?.sessions[0] ??
    recentMatches[0];
  const firstHref =
    navMatches[0]?.href ??
    (firstSession ? `/chat/${firstSession.id}` : undefined);
  return {
    q,
    navMatches,
    pinnedMatches,
    projectRows,
    recentMatches,
    totalResults,
    firstHref,
  };
}
