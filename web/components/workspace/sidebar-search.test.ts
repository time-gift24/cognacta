import { test } from "node:test";
import assert from "node:assert/strict";
import { searchSidebar } from "./sidebar-search";
import type { Session } from "./types";

const sessions: Session[] = [
  {
    id: "pinned", title: "Pinned", projectId: "project",
    archived: false, messages: [],
  },
  {
    id: "hidden", title: "Hidden", projectId: "project",
    archived: true, messages: [],
  },
  {
    id: "visible", title: "Unrelated title", projectId: "project",
    archived: false, messages: [],
  },
  { id: "recent", title: "Recent", archived: false, messages: [] },
];
const state = {
  sessions,
  projects: [{ id: "project", title: "Unique project" }],
  navItems: [{ label: "Knowledge", href: "/knowledge-base" }],
  pinned: [sessions[0]],
  pinnedIds: new Set(["pinned"]),
  activeSessionId: "visible",
  openProjects: {},
};

test("project title search selects the visible session and counts the same rows", () => {
  const result = searchSidebar({ ...state, query: "  UNIQUE  " });
  assert.equal(result.firstHref, "/chat/visible");
  assert.deepEqual(
    result.projectRows[0].sessions.map((session) => session.id),
    ["visible"],
  );
  assert.equal(result.totalResults, 2); // project heading + visible session
  assert.equal(result.projectRows[0].held, true);
  assert.equal(result.projectRows[0].expanded, true);
});

test("navigation, pinned, project, and recent results keep display order and exclude archives", () => {
  const result = searchSidebar({ ...state, query: "" });
  assert.equal(result.firstHref, "/knowledge-base");
  assert.equal(result.totalResults, 5);
  assert.equal(searchSidebar({ ...state, query: "pinned" }).firstHref, "/chat/pinned");
  assert.equal(searchSidebar({ ...state, query: "recent" }).firstHref, "/chat/recent");
  assert.equal(searchSidebar({ ...state, query: "hidden" }).totalResults, 0);
  assert.equal(searchSidebar({ ...state, query: "absent" }).firstHref, undefined);
});
