import type { WorkspaceDirectory } from "./access.ts"
import type { ThreadViewState } from "../chat/fold.ts"
import type { ThreadStoreRegistry } from "../chat/registry.ts"

export type Workspace = { id: string; name: string; path: string }

export type WorkspaceSession = {
  id: string
  workspaceId: string | null
  title: string
  blank: boolean
  status: ThreadViewState["status"]
  updatedAt: number
}

export type WorkspaceState = {
  workspaces: readonly Workspace[]
  sessions: readonly WorkspaceSession[]
  activeSessionId: string | null
  expandedWorkspaceIds: readonly string[]
  recentWorkspaceId: string | null
}

function validateDirectory({ path, name }: WorkspaceDirectory): void {
  if (
    ![path, name].every(
      (value) =>
        typeof value === "string" &&
        value.trim() &&
        !Array.from(value).some(
          (character) =>
            character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        )
    )
  )
    throw new Error("请选择有效的工作区目录。")
}

export function createWorkspaceStore(registry: ThreadStoreRegistry) {
  // ponytail: 本轮只在内存中模拟工作区；刷新重置，新增刷新恢复需单独需求。
  let state: WorkspaceState = {
    workspaces: [],
    sessions: [],
    activeSessionId: null,
    expandedWorkspaceIds: [],
    recentWorkspaceId: null,
  }
  const listeners = new Set<() => void>()
  const subscriptions = new Map<string, () => void>()

  const emit = () => {
    for (const listener of [...listeners]) listener()
  }
  const getState = () => state
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
  const expanded = (workspaceId: string | null) =>
    workspaceId === null || state.expandedWorkspaceIds.includes(workspaceId)
      ? state.expandedWorkspaceIds
      : [...state.expandedWorkspaceIds, workspaceId]

  const addWorkspace = (directory: WorkspaceDirectory): Workspace => {
    validateDirectory(directory)
    const existing = state.workspaces.find(
      (workspace) => workspace.path === directory.path
    )
    if (existing) return existing
    const workspace = {
      id: `workspace-${crypto.randomUUID()}`,
      name: directory.name,
      path: directory.path,
    }
    state = {
      ...state,
      workspaces: [...state.workspaces, workspace],
      recentWorkspaceId: workspace.id,
    }
    emit()
    return workspace
  }

  const selectSession = (id: string): void => {
    const session = state.sessions.find((entry) => entry.id === id)
    if (!session) return
    const expandedWorkspaceIds = expanded(session.workspaceId)
    if (
      state.activeSessionId === id &&
      expandedWorkspaceIds === state.expandedWorkspaceIds
    )
      return
    state = {
      ...state,
      activeSessionId: id,
      recentWorkspaceId: session.workspaceId,
      expandedWorkspaceIds,
    }
    emit()
  }

  const startSession = (workspaceId?: string): string | null => {
    const target = workspaceId ?? null
    if (
      target !== null &&
      !state.workspaces.some((workspace) => workspace.id === target)
    )
      return null
    const blank = state.sessions.find(
      (session) => session.workspaceId === target && session.blank
    )
    if (blank) {
      selectSession(blank.id)
      return blank.id
    }

    const id = `session-${crypto.randomUUID()}`
    const thread = registry.acquire(id)
    let lastUserId: string | undefined
    let lastStatus = thread.getState().status
    subscriptions.set(
      id,
      thread.subscribe(() => {
        const view = thread.getState()
        const user = view.messages.findLast(
          (message) => message.role === "user"
        )
        const newTurn = user?.id !== lastUserId
        if (!newTurn && view.status === lastStatus) return
        const completed =
          (lastStatus === "submitted" ||
            lastStatus === "streaming" ||
            lastStatus === "stopping") &&
          (view.status === "idle" || view.status === "failed")
        lastUserId = user?.id
        lastStatus = view.status
        state = {
          ...state,
          sessions: state.sessions.map((session) => {
            if (session.id !== id) return session
            let title = session.title
            if (session.blank && user) {
              const text = user.parts
                .flatMap((part) => (part.kind === "text" ? [part.text] : []))
                .join("")
                .replace(/\s+/g, " ")
                .trim()
              const characters = Array.from(text)
              title =
                characters.length > 48
                  ? `${characters.slice(0, 48).join("")}…`
                  : text
            }
            return {
              ...session,
              title,
              blank: user === undefined,
              status: view.status,
              updatedAt: newTurn || completed ? Date.now() : session.updatedAt,
            }
          }),
        }
        emit()
      })
    )
    state = {
      ...state,
      sessions: [
        ...state.sessions,
        {
          id,
          workspaceId: target,
          title: "新会话",
          blank: true,
          status: thread.getState().status,
          updatedAt: Date.now(),
        },
      ],
      activeSessionId: id,
      recentWorkspaceId: target,
      expandedWorkspaceIds: expanded(target),
    }
    emit()
    return id
  }

  const toggleWorkspace = (id: string): void => {
    if (!state.workspaces.some((workspace) => workspace.id === id)) return
    state = {
      ...state,
      expandedWorkspaceIds: state.expandedWorkspaceIds.includes(id)
        ? state.expandedWorkspaceIds.filter((entry) => entry !== id)
        : [...state.expandedWorkspaceIds, id],
    }
    emit()
  }

  const dispose = (): void => {
    for (const [id, unsubscribe] of subscriptions) {
      unsubscribe()
      registry.release(id)
    }
    subscriptions.clear()
    listeners.clear()
  }

  return {
    getState,
    subscribe,
    addWorkspace,
    startSession,
    selectSession,
    toggleWorkspace,
    dispose,
  }
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>
