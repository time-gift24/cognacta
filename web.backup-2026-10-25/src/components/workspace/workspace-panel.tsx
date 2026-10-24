import { useId, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  BubbleChatAddIcon,
  Folder01Icon,
  PlusSignIcon,
} from "@hugeicons-pro/core-stroke-rounded"
import { Button } from "@/components/motion/button"
import { cn } from "@/lib/utils"
import type {
  Workspace,
  WorkspaceSession,
  WorkspaceState,
  WorkspaceStore,
} from "@/workspace/store"

function SessionButton({
  session,
  activeSessionId,
  store,
  onNavigate,
}: {
  session: WorkspaceSession
  activeSessionId: string | null
  store: WorkspaceStore
  onNavigate: () => void
}) {
  return (
    <Button
      variant="ghost"
      aria-current={session.id === activeSessionId ? "page" : undefined}
      title={session.title}
      onClick={() => {
        store.selectSession(session.id)
        onNavigate()
      }}
      className={cn(
        "h-9 w-full min-w-0 justify-start gap-2 rounded-full px-3 text-left font-normal",
        session.id === activeSessionId && "bg-accent text-accent-foreground"
      )}
    >
      <span className="min-w-0 flex-1 truncate">{session.title}</span>
      {session.status === "submitted" ||
      session.status === "streaming" ||
      session.status === "stopping" ? (
        <span
          role="status"
          aria-label="正在生成"
          className="size-3 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent motion-reduce:animate-none"
        />
      ) : session.status === "failed" ? (
        <span className="shrink-0 text-xs text-destructive">失败</span>
      ) : null}
    </Button>
  )
}

function WorkspaceGroup({
  workspace,
  sessions,
  activeSessionId,
  expanded,
  store,
  onCreate,
  onNavigate,
}: {
  workspace: Workspace
  sessions: readonly WorkspaceSession[]
  activeSessionId: string | null
  expanded: boolean
  store: WorkspaceStore
  onCreate: (workspaceId: string) => void
  onNavigate: () => void
}) {
  const listId = useId()
  const [showAll, setShowAll] = useState(false)
  const rows = sessions
    .filter((session) => session.workspaceId === workspace.id && !session.blank)
    .toSorted(
      (a, b) => Number(b.blank) - Number(a.blank) || b.updatedAt - a.updatedAt
    )
  const running = (session: WorkspaceSession) =>
    session.status === "submitted" ||
    session.status === "streaming" ||
    session.status === "stopping"
  const regular = rows.filter((session) => !session.blank && !running(session))
  const visibleIds = new Set(
    (showAll ? regular : regular.slice(0, 5)).map((session) => session.id)
  )
  const visible = rows.filter(
    (session) =>
      session.blank ||
      running(session) ||
      session.id === activeSessionId ||
      visibleIds.has(session.id)
  )
  const hidden = rows.length - visible.length
  const active = rows.some((session) => session.id === activeSessionId)

  return (
    <section className="min-w-0">
      <div className="group flex min-w-0 items-center gap-1">
        <Button
          variant="ghost"
          title={workspace.path}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => {
            setShowAll(false)
            store.toggleWorkspace(workspace.id)
          }}
          className={cn(
            "h-9 min-w-0 flex-1 justify-start gap-2 rounded-full px-3 font-normal",
            active && "text-accent-foreground"
          )}
        >
          <span className="relative size-4 shrink-0">
            <HugeiconsIcon
              icon={Folder01Icon}
              size={16}
              aria-hidden="true"
              className="transition-opacity group-focus-within:opacity-0 group-hover:opacity-0"
            />
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              aria-hidden="true"
              className={cn(
                "absolute inset-0 opacity-0 transition-[opacity,transform] group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none",
                expanded && "rotate-90"
              )}
            />
          </span>
          <span className="truncate">{workspace.name}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={`在 ${workspace.name} 中新建会话`}
          title="新会话"
          onClick={() => onCreate(workspace.id)}
          className="shrink-0 rounded-full text-muted-foreground"
        >
          <HugeiconsIcon
            icon={BubbleChatAddIcon}
            size={16}
            aria-hidden="true"
          />
        </Button>
      </div>
      <div id={listId} hidden={!expanded}>
        {rows.length === 0 ? (
          <p className="px-9 py-2 text-xs text-muted-foreground">还没有会话</p>
        ) : (
          <ul className="mt-1 space-y-0.5 pl-3">
            {visible.map((session) => (
              <li key={session.id}>
                <SessionButton
                  session={session}
                  activeSessionId={activeSessionId}
                  store={store}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        )}
        {hidden > 0 || (showAll && regular.length > 5) ? (
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="mt-1 ml-6 rounded-full text-xs font-normal text-muted-foreground"
          >
            {showAll ? "收起会话" : `显示更多（${hidden}）`}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

export function WorkspacePanel({
  state,
  store,
  onAdd,
  onCreate,
  onNavigate,
}: {
  state: WorkspaceState
  store: WorkspaceStore
  onAdd: () => void
  onCreate: (workspaceId: string) => void
  onNavigate: () => void
}) {
  const sessions = state.sessions
    .filter((session) => session.workspaceId === null && !session.blank)
    .toSorted((a, b) => b.updatedAt - a.updatedAt)
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {sessions.length ? (
        <ul aria-label="会话" className="space-y-0.5">
          {sessions.map((session) => (
            <li key={session.id}>
              <SessionButton
                session={session}
                activeSessionId={state.activeSessionId}
                store={store}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-between pl-3">
        <h2 className="text-xs font-medium text-muted-foreground">工作区</h2>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="添加工作区"
          title="添加工作区"
          className="rounded-full text-muted-foreground"
          onClick={() => {
            onNavigate()
            onAdd()
          }}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
        </Button>
      </div>
      {state.workspaces.map((workspace) => (
        <WorkspaceGroup
          key={workspace.id}
          workspace={workspace}
          sessions={state.sessions}
          activeSessionId={state.activeSessionId}
          expanded={state.expandedWorkspaceIds.includes(workspace.id)}
          store={store}
          onCreate={onCreate}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}
