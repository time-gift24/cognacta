import {
  Component,
  lazy,
  Suspense,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BotIcon,
  BubbleChatAddIcon,
  FileAddIcon,
  QuillWrite01Icon,
  Folder01Icon,
  HistoryIcon,
  PackageIcon,
  PanelRightIcon,
  Search01Icon,
} from "@hugeicons-pro/core-stroke-rounded"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useAppDependencies } from "@/app/dependencies"
import type { AgentEntry, AgentResource, AgentResources } from "@/agents/source"
import type { ManagedSkill } from "@/skills/library"
import type { ModelChoice } from "@/models/source"
import { useBackendData } from "@/components/workbench/use-backend-data"
import { ChatScreen } from "@/components/chat/chat-screen"
import { MorphicTooltip } from "@/components/premium/morphic-tooltip/morphic-tooltip"
import {
  defaultSections,
  SidebarRail,
  type SidebarRailAction,
  type SidebarRailItem,
  type SidebarRailSection,
} from "@/components/premium/sidebar-blocks/sidebar-rail"
import { Button } from "@/components/motion/button"
import { useIsMobile } from "@/components/motion/animated-sidebar"
import { Select } from "@/components/premium/select/select"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import {
  MorphicCommandPalette,
  MorphicCommandPaletteContent,
} from "@/components/beui/premium/morphic-command-palette/morphic-command-palette"
import {
  WorkbenchPanel,
  type WorkbenchHandle,
} from "@/components/workbench/workbench"
import { WorkspacePanel } from "@/components/workspace/workspace-panel"
import { WorkspacePicker } from "@/components/workspace/workspace-picker"
import { useToast } from "@/components/ui/toast"
import { EASE_OUT } from "@/lib/ease"
import { ThemePicker } from "@/components/theme-picker"
import { RunHistory } from "@/components/runs/run-history"
import { ClientSettingsScreen } from "@/components/settings/client-settings"
import {
  SettingsNavigation,
  type SettingsSection,
} from "@/components/settings/settings-navigation"
import { McpManager } from "@/components/premium/agent-builder/mcp-manager"
import { replayRuns } from "@/runs/replay"
import type { RunRecord } from "@/runs/source"
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/motion/animated-modal"

const AgentBuilder = lazy(() =>
  import("@/components/premium/agent-builder/agent-builder").then((module) => ({
    default: module.AgentBuilder,
  }))
)
const SkillLibraryScreen = lazy(() =>
  import("@/components/skills/skill-library-screen").then((module) => ({
    default: module.SkillLibraryScreen,
  }))
)
const AgentLibraryScreen = lazy(() =>
  import("@/components/agents/agent-library-screen").then((module) => ({
    default: module.AgentLibraryScreen,
  }))
)

class PageLoadBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div
        role="alert"
        className="grid h-full place-content-center gap-3 px-6 text-center"
      >
        <p className="text-sm">页面加载失败，请稍后刷新重试。</p>
        <p className="text-xs text-muted-foreground">
          刷新会清空未保存的草稿，请先切换栏目保存。
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      </div>
    )
  }
}

type View =
  | { kind: "chat" }
  | { kind: "session"; threadId: string; title: string }
  | { kind: "agent"; agentId: string }
  | { kind: "skill" }
  | { kind: "skill-draft" }
  | { kind: "page"; sectionId: string; itemId: string }
  | { kind: "section"; sectionId: string; workspaceId?: string }

function skillResource(
  skill: Pick<ManagedSkill, "id" | "name" | "description"> &
    Partial<Pick<ManagedSkill, "origin" | "version" | "contentId">>
): AgentResource {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    contentId: skill.contentId,
    source: skill.origin ?? "local",
    releaseTag: skill.version,
  }
}

export function App() {
  const dependencies = useAppDependencies()
  const toast = useToast()
  const [attempt, setAttempt] = useState(0)
  const [modelRevision, setModelRevision] = useState(0)
  useEffect(
    () =>
      dependencies.models.subscribe?.(() =>
        setModelRevision((value) => value + 1)
      ),
    [dependencies.models]
  )
  const agents = useBackendData(
    attempt,
    () => dependencies.agents.load(),
    dependencies.agents
  )
  const skills = useBackendData(
    attempt,
    async () => {
      const items = await (dependencies.skillLibrary?.list() ??
        dependencies.skills.list())
      return items.map(skillResource)
    },
    dependencies.skillLibrary ?? dependencies.skills
  )
  const models = useBackendData(
    `${attempt}:${modelRevision}`,
    () => dependencies.models.list(),
    dependencies.models
  )
  useEffect(() => {
    if (models.status !== "error") return
    const id = toast.notify({
      key: "models-error",
      title: "模型目录读取失败",
      description: "可重试或在设置中检查 Provider。",
      tone: "error",
      actionLabel: "重试模型目录",
      onAction: () => setModelRevision((value) => value + 1),
    })
    return () => toast.dismiss(id)
  }, [models.status, toast])
  if (agents.status === "error" || skills.status === "error") {
    return (
      <div
        role="alert"
        className="grid h-full place-content-center gap-3 text-center"
      >
        <p>资源加载失败，请重试。</p>
        <Button
          variant="outline"
          onClick={() => setAttempt((current) => current + 1)}
        >
          重试
        </Button>
      </div>
    )
  }
  if (agents.status !== "ready" || skills.status !== "ready") {
    return (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        正在加载工作区…
      </p>
    )
  }
  return (
    <WorkspaceApp
      initialAgents={agents.data.agents}
      resources={agents.data.resources}
      skills={skills.data}
      models={models.status === "ready" ? models.data : []}
    />
  )
}

function WorkspaceApp({
  initialAgents,
  resources: initialResources,
  skills,
  models,
}: {
  initialAgents: readonly AgentEntry[]
  resources: AgentResources
  skills: readonly AgentResource[]
  models: readonly ModelChoice[]
}) {
  const {
    workspaces: store,
    workbench: workbenchBackend,
    agents: agentSource,
    desktop,
    threads,
    runs,
    skillLibrary,
  } = useAppDependencies()
  const desktopState = useSyncExternalStore(
    desktop.subscribe,
    desktop.getState,
    desktop.getState
  )
  const toast = useToast()
  useEffect(() => {
    if (!desktopState.closeBlocked) return
    const id = toast.notify({
      key: "close-blocked",
      title: "任务正在执行",
      description: "等待任务结束或先停止任务后退出。",
      duration: 6000,
    })
    return () => toast.dismiss(id)
  }, [desktopState.closeBlocked, toast])
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  )
  const [picker, setPicker] = useState<"add" | null>(null)
  const [skillSearchOpen, setSkillSearchOpen] = useState(false)
  const [agents, setAgents] = useState<readonly AgentEntry[]>(initialAgents)
  const [resources, setResources] = useState(initialResources)
  const [agentBusy, setAgentBusy] = useState(false)
  const agentOperation = useRef(false)
  const [localSessions, setLocalSessions] = useState<
    { threadId: string; title: string }[]
  >([])
  const [experimentSkillId, setExperimentSkillId] = useState<string | null>(
    null
  )
  const [experimentAgentId, setExperimentAgentId] = useState("")
  const [visitedAgents, setVisitedAgents] = useState<readonly string[]>([])
  const [unsavedAgentIds, setUnsavedAgentIds] = useState<readonly string[]>([])
  const unsavedAgentIdsRef = useRef<readonly string[]>([])
  const agentVersion = useRef(0)
  const [agentListVisited, setAgentListVisited] = useState(false)
  const [view, setView] = useState<View>({ kind: "chat" })
  const currentView = useRef(view)
  const mounted = useRef(false)
  useLayoutEffect(() => {
    currentView.current = view
  }, [view])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (!store.getState().activeSessionId) store.startSession()
  }, [store])
  const [agentToolbarTarget, setAgentToolbarTarget] =
    useState<HTMLDivElement | null>(null)
  const [skillCatalog, setSkillCatalog] =
    useState<readonly AgentResource[]>(skills)
  const [openedSkillId, setOpenedSkillId] = useState<string | null>(null)
  const [skillsVisited, setSkillsVisited] = useState(false)
  const [workbenchOpen, setWorkbenchOpen] = useState(true)
  const mobileWindow = useIsMobile()
  const workbenchOverlay = mobileWindow && workbenchOpen
  const [navigationExpanded, setNavigationExpanded] = useState(true)
  const [compactWindow, setCompactWindow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(width < 1100px)").matches
  )
  const workbenchId = useId()
  const contentId = useId()
  const workbenchRef = useRef<WorkbenchHandle>(null)
  const workbenchToggleRef = useRef<HTMLButtonElement>(null)
  const reduce = useReducedMotion()
  const contentRef = useRef<HTMLElement>(null)
  const settingsScrollRef = useRef<HTMLDivElement>(null)
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSection>("theme")
  const lifetime = useRef({ version: 0 })
  useEffect(() => {
    const media = window.matchMedia("(width < 1100px)")
    const onChange = () => setCompactWindow(media.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])
  useEffect(() => {
    let previous = desktop.getState().browserRequest
    if (previous > 0) workbenchRef.current?.openBrowser()
    return desktop.subscribe(() => {
      const next = desktop.getState().browserRequest
      if (next === previous) return
      previous = next
      workbenchRef.current?.openBrowser()
      setWorkbenchOpen(true)
    })
  }, [desktop])
  useEffect(() => {
    const lifecycle = lifetime.current
    const current = ++lifecycle.version
    return () => {
      // StrictMode and Fast Refresh reconnect before this microtask runs.
      queueMicrotask(() => {
        if (current === lifecycle.version) store.dispose()
      })
    }
  }, [store])
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "j"
      )
        return
      event.preventDefault()
      setWorkbenchOpen((open) => !open)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
  const wasWorkbenchOpen = useRef(workbenchOpen)
  useLayoutEffect(() => {
    const panel = document.getElementById(workbenchId)
    const active = document.activeElement
    if (workbenchOverlay && !panel?.contains(active))
      panel?.focus({ preventScroll: true })
    else if (
      wasWorkbenchOpen.current &&
      !workbenchOpen &&
      (active === document.body || panel?.contains(active))
    )
      workbenchToggleRef.current?.focus({ preventScroll: true })
    wasWorkbenchOpen.current = workbenchOpen
  }, [workbenchId, workbenchOpen, workbenchOverlay])
  const activeSession = state.sessions.find(
    (session) => session.id === state.activeSessionId
  )
  const activeWorkspace = state.workspaces.find(
    (workspace) => workspace.id === activeSession?.workspaceId
  )
  const browserThreadId =
    view.kind === "session"
      ? view.threadId
      : view.kind === "chat"
        ? (activeSession?.id ?? null)
        : null
  useEffect(() => {
    let current = true
    void desktop
      .selectBrowserThread?.(browserThreadId)
      .catch((error: unknown) => {
        if (current)
          toast.notify({
            key: "app-action-error",
            title:
              error instanceof Error ? error.message : "浏览器页面切换失败。",
            tone: "error",
          })
      })
    return () => {
      current = false
    }
  }, [desktop, browserThreadId, toast])
  const activeSkill = skillCatalog.find((skill) => skill.id === openedSkillId)
  const activeSectionId =
    view.kind === "session"
      ? "runs"
      : view.kind === "agent"
        ? "agents"
        : view.kind === "skill" || view.kind === "skill-draft"
          ? "skills"
          : view.kind === "page" || view.kind === "section"
            ? view.sectionId
            : "workspace"
  const activeItemId =
    view.kind === "session"
      ? view.threadId
      : view.kind === "agent"
        ? `agent:${view.agentId}`
        : view.kind === "skill" || view.kind === "skill-draft"
          ? view.kind === "skill-draft"
            ? ""
            : `skill:${openedSkillId}`
          : view.kind === "page"
            ? view.itemId
            : view.kind === "section"
              ? ""
              : (activeSession?.id ?? "")
  const agentSection = {
    id: "agents",
    label: "Agent",
    icon: BotIcon,
    selectFirstItem: false,
    overviewLabel: "Agent 列表",
    groups: [
      {
        label: "常用 Agent",
        items: agents
          .filter(
            (agent) =>
              agent.source !== "official" && !unsavedAgentIds.includes(agent.id)
          )
          .map((agent) => ({
            id: `agent:${agent.id}`,
            label: agent.configuration.name.trim() || "未命名 Agent",
            icon: BotIcon,
          })),
      },
      ...(agents.some((agent) => agent.source === "official")
        ? [
            {
              label: "官方 Agent",
              items: agents
                .filter((agent) => agent.source === "official")
                .map((agent) => ({
                  id: `agent:${agent.id}`,
                  label: agent.configuration.name,
                  icon: BotIcon,
                })),
            },
          ]
        : []),
    ],
  }
  const sections = [
    ...defaultSections.slice(0, 1).map((section) =>
      section.id === "workspace"
        ? {
            ...section,
            groups: [
              {
                label: "会话",
                items: state.sessions
                  .filter(
                    (session) => session.workspaceId === null && !session.blank
                  )
                  .toSorted((a, b) => b.updatedAt - a.updatedAt)
                  .map((session) => ({ id: session.id, label: session.title })),
              },
              ...state.workspaces.map((workspace) => ({
                label: workspace.name,
                items: [
                  {
                    id: `workspace:${workspace.id}`,
                    label: workspace.name,
                    icon: Folder01Icon,
                  },
                  ...state.sessions
                    .filter(
                      (session) =>
                        session.workspaceId === workspace.id && !session.blank
                    )
                    .map((session) => ({
                      id: session.id,
                      label: session.blank ? "新会话" : session.title,
                    })),
                ],
              })),
            ],
            renderContent: (close: () => void) => (
              <WorkspacePanel
                state={
                  view.kind === "section"
                    ? { ...state, activeSessionId: null }
                    : state
                }
                store={store}
                onAdd={() => setPicker("add")}
                onCreate={(workspaceId) => {
                  startSession(workspaceId)
                  close()
                }}
                onNavigate={() => {
                  setView({ kind: "chat" })
                  close()
                  contentRef.current?.focus({ preventScroll: true })
                }}
              />
            ),
          }
        : section
    ),
    agentSection,
    ...(runs
      ? [
          {
            id: "runs",
            label: "执行记录",
            icon: HistoryIcon,
            selectFirstItem: false,
            groups: [
              {
                label: "本次打开的会话",
                items: localSessions.map((session) => ({
                  id: session.threadId,
                  label: session.title,
                })),
              },
            ],
          },
        ]
      : []),
    {
      id: "skills",
      label: "技能",
      icon: PackageIcon,
      selectFirstItem: false,
      overviewLabel: "Skill 列表",
      groups: [
        {
          label: "常用 Skill",
          action: (
            <MorphicTooltip content="搜索技能" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                aria-label="搜索技能"
                aria-haspopup="dialog"
                onClick={() => setSkillSearchOpen(true)}
                className="size-7 rounded-full text-muted-foreground hover:text-foreground pointer-coarse:size-11"
              >
                <HugeiconsIcon
                  icon={Search01Icon}
                  aria-hidden="true"
                  size={14}
                />
              </Button>
            </MorphicTooltip>
          ),
          items: skillCatalog.map((skill) => ({
            id: `skill:${skill.id}`,
            label: skill.name,
            icon: PackageIcon,
          })),
        },
      ],
    },
  ]
  const settingsSection = defaultSections.find(
    (section) => section.id === "settings"
  )
  if (settingsSection)
    sections.push({
      ...settingsSection,
      selectFirstItem: false,
      groups: settingsSection.groups.map((group) => ({
        ...group,
        label: "客户端",
        items: group.items.filter((item) => item.id === "preferences"),
      })),
      renderContent: (closeNavigation) => (
        <SettingsNavigation
          active={activeSettingsSection}
          onNavigate={(section) => {
            closeNavigation()
            requestAnimationFrame(() => {
              const target =
                settingsScrollRef.current?.querySelector<HTMLElement>(
                  `#client-settings-${section}`
                )
              target?.focus({ preventScroll: true })
              target?.scrollIntoView({
                behavior: reduce ? "instant" : "smooth",
                block: "start",
              })
            })
          }}
        />
      ),
    })
  const sectionActions: Partial<Record<string, SidebarRailAction>> = {
    workspace: {
      label: "新会话",
      icon: BubbleChatAddIcon,
      onSelect: () => startSession(),
    },
    agents: {
      label: "新建 Agent",
      icon: QuillWrite01Icon,
      disabled: agentBusy || !agentSource.create,
      onSelect: () => void createAgent(),
    },
    skills: {
      label: "新建 Skill",
      icon: FileAddIcon,
      disabled: !skillLibrary,
      onSelect: openSkillCreate,
    },
  }
  const activeSection = sections.find(
    (section) => section.id === activeSectionId
  )
  const activePage = activeSection?.groups
    .flatMap((group) => group.items)
    .find((item) => item.id === activeItemId)
  const overviewWorkspace =
    view.kind === "section"
      ? state.workspaces.find((workspace) => workspace.id === view.workspaceId)
      : undefined
  const overviewItems: readonly SidebarRailItem[] =
    view.kind === "section" && view.sectionId === "workspace"
      ? overviewWorkspace
        ? state.sessions
            .filter(
              (session) =>
                session.workspaceId === overviewWorkspace.id && !session.blank
            )
            .map((session) => ({
              id: session.id,
              label: session.blank ? "新会话" : session.title,
            }))
        : [
            ...state.sessions
              .filter(
                (session) => session.workspaceId === null && !session.blank
              )
              .toSorted((a, b) => b.updatedAt - a.updatedAt)
              .map((session) => ({ id: session.id, label: session.title })),
            ...state.workspaces.map((workspace) => ({
              id: `workspace:${workspace.id}`,
              label: workspace.name,
            })),
          ]
      : (activeSection?.groups.flatMap((group) => group.items) ?? [])

  async function refreshAgents() {
    const version = agentVersion.current
    const loaded = await agentSource.load()
    if (!mounted.current) return
    setAgents((current) => {
      if (version !== agentVersion.current) return current
      return [
        ...loaded.agents.map((agent) => ({
          ...agent,
          draft: current.find((entry) => entry.id === agent.id)?.draft,
        })),
        ...current.filter(
          (entry) =>
            unsavedAgentIdsRef.current.includes(entry.id) &&
            !loaded.agents.some((agent) => agent.id === entry.id)
        ),
      ]
    })
    setResources(loaded.resources)
  }

  async function createAgent(copyFrom?: string) {
    if (!agentSource.create || agentOperation.current) return
    agentOperation.current = true
    setAgentBusy(true)
    toast.dismissKey("app-action-error")
    const origin = currentView.current
    try {
      const agent = await agentSource.create(
        copyFrom ? { copyFrom } : undefined
      )
      if (!mounted.current) return
      agentVersion.current++
      unsavedAgentIdsRef.current = [...unsavedAgentIdsRef.current, agent.id]
      setUnsavedAgentIds(unsavedAgentIdsRef.current)
      setAgents((current) => [
        ...current.filter((item) => item.id !== agent.id),
        agent,
      ])
      if (currentView.current === origin) openAgent(agent.id)
    } catch (cause) {
      if (mounted.current)
        toast.notify({
          key: "app-action-error",
          title:
            cause instanceof Error
              ? cause.message
              : "创建 Agent 失败，请重试。",
          tone: "error",
        })
    } finally {
      agentOperation.current = false
      if (mounted.current) setAgentBusy(false)
    }
  }

  function openAgent(id: string) {
    setVisitedAgents((current) =>
      current.includes(id) ? current : [...current, id]
    )
    setView({ kind: "agent", agentId: id })
    wasWorkbenchOpen.current = false
    setWorkbenchOpen(false)
    contentRef.current?.focus({ preventScroll: true })
  }

  function openSkillCreate() {
    setSkillsVisited(true)
    setWorkbenchOpen(false)
    setView({ kind: "skill-draft" })
    contentRef.current?.focus({ preventScroll: true })
  }

  function showSession(threadId: string, title: string) {
    setView({ kind: "session", threadId, title })
    if (compactWindow) setWorkbenchOpen(false)
  }

  useEffect(() => {
    if (view.kind !== "session") return
    const { threadId, title } = view
    const thread = threads.get(threadId)
    const publish = () => {
      if (
        !thread.getState().messages.some((message) => message.role === "user")
      )
        return
      setLocalSessions((current) =>
        current.some((session) => session.threadId === threadId)
          ? current
          : [...current, { threadId, title }]
      )
    }
    publish()
    return thread.subscribe(publish)
  }, [view, threads])

  function startAgentSession(agent: AgentEntry, skillId?: string) {
    if (!runs) return
    const threadId = `session-${crypto.randomUUID()}`
    runs.bindSession(threadId, {
      agentId: agent.id,
      ...(skillId ? { experimentSkillId: skillId } : {}),
    })
    showSession(
      threadId,
      `${agent.configuration.name}${skillId ? " · Skill 实验" : ""}`
    )
  }

  async function continueSession(
    run: RunRecord,
    records: readonly RunRecord[]
  ) {
    const thread = threads.get(run.threadId)
    thread.restore(replayRuns(run.threadId, records))
    const snapshot = run.snapshot ?? (await runs?.snapshot(run.threadId))
    if (typeof snapshot?.model === "string")
      thread.updateDraft({ model: snapshot.model })
    showSession(run.threadId, run.title)
  }

  function openSection(sectionId: string, workspaceId?: string) {
    if (sectionId === "agents") setAgentListVisited(true)
    if (sectionId === "skills") setSkillsVisited(true)
    if (sectionId === "agents" || sectionId === "skills")
      setWorkbenchOpen(false)
    contentRef.current?.focus({ preventScroll: true })
    setView({ kind: "section", sectionId, workspaceId })
  }

  function startSession(workspaceId?: string) {
    setView({ kind: "chat" })
    contentRef.current?.focus({ preventScroll: true })
    store.startSession(workspaceId)
  }

  function returnToTask() {
    const task = desktop.getState().task
    if (!task) return
    if (
      runs &&
      !state.sessions.some((session) => session.id === task.threadId)
    ) {
      showSession(
        task.threadId,
        localSessions.find((session) => session.threadId === task.threadId)
          ?.title ?? task.title
      )
    } else if (task.threadId.startsWith("agent-test:")) {
      const agentId = task.threadId.slice("agent-test:".length)
      const agent = agents.find((entry) => entry.id === agentId)
      if (!agent) return
      openAgent(agentId)
      workbenchRef.current?.openAgentDebug(agentId, agent.configuration.name)
      setWorkbenchOpen(true)
    } else {
      store.selectSession(task.threadId)
      setView({ kind: "chat" })
      if (compactWindow) setWorkbenchOpen(false)
    }
  }

  function selectItem(item: SidebarRailItem, section: SidebarRailSection) {
    if (section.id === "runs") {
      const session = localSessions.find((entry) => entry.threadId === item.id)
      if (session) showSession(session.threadId, session.title)
      return
    }
    if (section.id === "skills") {
      setOpenedSkillId(item.id.slice("skill:".length))
      setView({ kind: "skill" })
      return
    }
    if (section.id === "agents") {
      const agentId = item.id.slice("agent:".length)
      openAgent(agentId)
      return
    }
    if (section.id !== "workspace") {
      if (section.id === "settings") setWorkbenchOpen(false)
      setView({ kind: "page", sectionId: section.id, itemId: item.id })
      return
    }
    if (item.id.startsWith("workspace:"))
      startSession(item.id.slice("workspace:".length))
    else {
      setView({ kind: "chat" })
      store.selectSession(item.id)
    }
  }

  return (
    <>
      <a
        href={`#${workbenchOverlay ? workbenchId : contentId}`}
        className="fixed top-3 left-3 z-100 -translate-y-24 rounded-md border border-border bg-background px-4 py-2 text-sm focus:translate-y-0 focus:outline-2 focus:outline-ring"
      >
        {workbenchOverlay ? "跳到工作台" : "跳到主要内容"}
      </a>
      <SidebarRail
        workspaceName="Cognacta"
        workspaceInert={workbenchOverlay}
        expanded={navigationExpanded && (!compactWindow || !workbenchOpen)}
        onExpandedChange={(expanded) => {
          setNavigationExpanded(expanded)
          if (expanded && compactWindow) setWorkbenchOpen(false)
        }}
        railActions={<ThemePicker />}
        panelHeader={
          activeSectionId === "settings" ? (
            <h2 className="text-xl font-medium">设置</h2>
          ) : undefined
        }
        activeSectionId={activeSectionId}
        activeItemId={activeItemId}
        onSectionSelect={(section) => {
          if (compactWindow) setWorkbenchOpen(false)
          if (section.id === "workspace") setView({ kind: "chat" })
          if (section.id === "runs") openSection("runs")
          if (section.id === "settings") {
            setWorkbenchOpen(false)
            setView({
              kind: "page",
              sectionId: "settings",
              itemId: "preferences",
            })
          }
          if (section.id === "agents") openSection("agents")
          if (section.id === "skills") {
            setWorkbenchOpen(false)
            openSection("skills")
          }
        }}
        onParentSelect={(section) => openSection(section.id)}
        workspaceHeaderClassName={workbenchOpen ? undefined : "pr-10"}
        workspaceHeader={
          view.kind === "agent" ? (
            <div
              ref={setAgentToolbarTarget}
              className="@container/agent-header flex min-w-0 flex-1"
            />
          ) : view.kind === "skill" || view.kind === "skill-draft" ? (
            <div className="@container/skill-header flex min-w-0 flex-1 items-center gap-2">
              <Breadcrumbs
                items={[
                  { label: "技能", onSelect: () => openSection("skills") },
                  {
                    label:
                      view.kind === "skill-draft"
                        ? "新建 Skill"
                        : (activeSkill?.name ?? "技能"),
                  },
                ]}
              />
            </div>
          ) : view.kind === "session" ? (
            <Breadcrumbs
              items={[
                { label: "执行记录", onSelect: () => openSection("runs") },
                { label: view.title },
              ]}
            />
          ) : view.kind === "chat" ? (
            <Breadcrumbs
              items={[
                { label: "工作区", onSelect: () => openSection("workspace") },
                ...(activeWorkspace
                  ? [
                      {
                        label: activeWorkspace.name,
                        onSelect: () =>
                          openSection("workspace", activeWorkspace.id),
                      },
                    ]
                  : []),
                ...(activeSession
                  ? [
                      {
                        label: activeSession.blank
                          ? "新会话"
                          : activeSession.title,
                      },
                    ]
                  : []),
              ]}
            />
          ) : view.kind === "page" ? (
            <Breadcrumbs
              items={[
                {
                  label: activeSection?.label ?? "设置",
                  onSelect: () => openSection(view.sectionId),
                },
                { label: activePage?.label ?? "偏好设置" },
              ]}
            />
          ) : view.kind === "section" ? (
            <Breadcrumbs
              items={[
                {
                  label: activeSection?.label ?? "工作区",
                  onSelect: () => openSection(view.sectionId),
                },
                ...(overviewWorkspace
                  ? [{ label: overviewWorkspace.name }]
                  : []),
              ]}
            />
          ) : undefined
        }
        endPanel={
          <WorkbenchPanel
            ref={workbenchRef}
            id={workbenchId}
            open={workbenchOpen}
            backend={workbenchBackend}
            scope={
              view.kind === "session"
                ? { sessionId: view.threadId }
                : activeSession
                  ? {
                      workspaceId: activeWorkspace?.id,
                      workspacePath: activeWorkspace?.path,
                      sessionId: activeSession.id,
                    }
                  : null
            }
            models={models}
            onClose={() => setWorkbenchOpen(false)}
            onReturnToApproval={() => returnToTask()}
          />
        }
        headerOverlay={
          <AnimatePresence>
            {workbenchOpen ? null : (
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }
                }
                className="absolute top-1.5 right-3 z-30"
              >
                <MorphicTooltip content="打开工作台（⌘J）" side="left">
                  <Button
                    ref={workbenchToggleRef}
                    variant="ghost"
                    size="icon"
                    aria-label="打开工作台"
                    aria-expanded={false}
                    aria-controls={workbenchId}
                    onClick={() => setWorkbenchOpen(true)}
                    className="size-9 translate-x-1 rounded-full border border-border bg-popover/80 opacity-60 backdrop-blur-md transition-[opacity,translate] duration-200 ease-out hover:translate-x-0 hover:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100 motion-reduce:transition-none"
                  >
                    <HugeiconsIcon
                      icon={PanelRightIcon}
                      aria-hidden="true"
                      size={16}
                    />
                  </Button>
                </MorphicTooltip>
              </motion.div>
            )}
          </AnimatePresence>
        }
        contentClassName="p-0 sm:p-0"
        sections={sections}
        actions={sectionActions}
        onItemSelect={selectItem}
      >
        <div className="flex h-full min-h-0 flex-col">
          <main
            id={contentId}
            ref={contentRef}
            tabIndex={-1}
            className="min-h-0 flex-1 outline-none"
          >
            {skillsVisited ||
            openedSkillId ||
            (view.kind === "section" && view.sectionId === "skills") ? (
              <div
                className={
                  view.kind === "skill" ||
                  view.kind === "skill-draft" ||
                  (view.kind === "section" && view.sectionId === "skills")
                    ? "h-full min-h-0"
                    : "hidden"
                }
              >
                <PageLoadBoundary>
                  <Suspense
                    fallback={
                      <p
                        role="status"
                        className="p-6 text-sm text-muted-foreground"
                      >
                        正在加载技能…
                      </p>
                    }
                  >
                    <SkillLibraryScreen
                      active={
                        view.kind === "skill" ||
                        view.kind === "skill-draft" ||
                        (view.kind === "section" && view.sectionId === "skills")
                      }
                      creating={view.kind === "skill-draft"}
                      skillId={
                        (view.kind === "section" &&
                          view.sectionId === "skills") ||
                        view.kind === "skill-draft"
                          ? null
                          : openedSkillId
                      }
                      onOpenSkill={(id) => {
                        contentRef.current?.focus({ preventScroll: true })
                        if (id === null) openSection("skills")
                        else {
                          setOpenedSkillId(id)
                          setView({ kind: "skill" })
                        }
                      }}
                      onCatalogChange={(items) => {
                        setSkillCatalog(items.map(skillResource))
                        setOpenedSkillId((current) =>
                          items.some((item) => item.id === current)
                            ? current
                            : null
                        )
                      }}
                      onExperiment={
                        runs
                          ? (id) => {
                              setExperimentSkillId(id)
                              setExperimentAgentId(agents[0]?.id ?? "")
                            }
                          : undefined
                      }
                    />
                  </Suspense>
                </PageLoadBoundary>
              </div>
            ) : null}
            {agentListVisited ? (
              <div
                className={
                  view.kind === "section" && view.sectionId === "agents"
                    ? "h-full min-h-0"
                    : "hidden"
                }
              >
                <PageLoadBoundary>
                  <Suspense
                    fallback={
                      <p
                        role="status"
                        className="p-6 text-sm text-muted-foreground"
                      >
                        正在加载 Agent…
                      </p>
                    }
                  >
                    <AgentLibraryScreen
                      agents={agents}
                      busy={agentBusy}
                      canCreate={!!agentSource.create}
                      onOpen={openAgent}
                      onCopy={
                        agentSource.create
                          ? (id) => void createAgent(id)
                          : undefined
                      }
                    />
                  </Suspense>
                </PageLoadBoundary>
              </div>
            ) : null}
            {agents
              .filter((item) => visitedAgents.includes(item.id))
              .map((agent) => (
                <div
                  key={agent.id}
                  data-agent-id={agent.id}
                  className={
                    view.kind === "agent" && view.agentId === agent.id
                      ? "h-full min-h-0"
                      : "hidden"
                  }
                >
                  <PageLoadBoundary>
                    <Suspense
                      fallback={
                        <p
                          role="status"
                          className="p-6 text-sm text-muted-foreground"
                        >
                          正在加载 Agent…
                        </p>
                      }
                    >
                      <AgentBuilder
                        active={
                          view.kind === "agent" && view.agentId === agent.id
                        }
                        copyBusy={agentBusy}
                        initialConfiguration={agent.configuration}
                        initialEditing={unsavedAgentIds.includes(agent.id)}
                        readOnly={agent.source === "official"}
                        showApproval={desktopState.simulated}
                        debugLabel={runs ? "开始新会话" : undefined}
                        onCopy={
                          agent.source === "official" && agentSource.create
                            ? () => void createAgent(agent.id)
                            : undefined
                        }
                        resourceManager={
                          <McpManager
                            source={agentSource}
                            servers={resources.mcpServers}
                            onChanged={refreshAgents}
                          />
                        }
                        mcpServers={resources.mcpServers}
                        tools={resources.tools}
                        skills={
                          skillLibrary
                            ? skillCatalog
                            : [
                                ...resources.skills.filter(
                                  (entry) =>
                                    !skillCatalog.some(
                                      (skill) => skill.id === entry.id
                                    )
                                ),
                                ...skillCatalog,
                              ]
                        }
                        initialDraft={agent.draft}
                        onDraftChange={(draft) =>
                          setAgents((current) =>
                            current.map((item) =>
                              item.id === agent.id ? { ...item, draft } : item
                            )
                          )
                        }
                        toolbarTarget={
                          view.kind === "agent" && view.agentId === agent.id
                            ? agentToolbarTarget
                            : null
                        }
                        onBack={() => openSection("agents")}
                        onDebug={() => {
                          if (runs) {
                            startAgentSession(agent)
                            return
                          }
                          workbenchRef.current?.openAgentDebug(
                            agent.id,
                            agent.configuration.name
                          )
                          setWorkbenchOpen(true)
                        }}
                        onSave={async (configuration) => {
                          await agentSource.save(agent.id, configuration)
                          agentVersion.current++
                          unsavedAgentIdsRef.current =
                            unsavedAgentIdsRef.current.filter(
                              (id) => id !== agent.id
                            )
                          setUnsavedAgentIds(unsavedAgentIdsRef.current)
                          setAgents((current) =>
                            current.map((item) =>
                              item.id === agent.id
                                ? {
                                    ...item,
                                    configuration,
                                    draft:
                                      JSON.stringify(
                                        item.draft ?? configuration
                                      ) === JSON.stringify(configuration)
                                        ? undefined
                                        : item.draft,
                                  }
                                : item
                            )
                          )
                        }}
                      />
                    </Suspense>
                  </PageLoadBoundary>
                </div>
              ))}
            {view.kind === "session" ? (
              <ChatScreen
                key={view.threadId}
                threadId={view.threadId}
                models={models}
                workspaceName={view.title}
                suggestions={[]}
              />
            ) : view.kind === "section" && view.sectionId === "runs" && runs ? (
              <RunHistory source={runs} onContinue={continueSession} />
            ) : view.kind === "section" &&
              view.sectionId === "agents" ? null : view.kind === "section" &&
              view.sectionId === "skills" ? null : view.kind === "section" ? (
              <section
                data-slot="navigation-overview"
                aria-label={overviewWorkspace?.name ?? activeSection?.label}
                className="mx-auto w-full max-w-3xl px-6 py-8 sm:px-8"
              >
                {overviewItems.length ? (
                  <ul className="space-y-1">
                    {overviewItems.map((item) => (
                      <li key={item.id}>
                        <Button
                          variant="ghost"
                          className="h-auto min-h-11 w-full justify-start rounded-full px-4 py-3 text-left font-normal"
                          onClick={() => {
                            if (!activeSection) return
                            if (
                              activeSection.id === "workspace" &&
                              item.id.startsWith("workspace:")
                            )
                              openSection(
                                "workspace",
                                item.id.slice("workspace:".length)
                              )
                            else selectItem(item, activeSection)
                          }}
                        >
                          <span className="truncate">{item.label}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无内容。</p>
                )}
              </section>
            ) : view.kind === "page" &&
              view.sectionId === "settings" &&
              view.itemId === "preferences" ? (
              <ClientSettingsScreen
                scrollRef={settingsScrollRef}
                onSectionChange={setActiveSettingsSection}
              />
            ) : view.kind === "page" ||
              view.kind === "skill" ||
              view.kind === "skill-draft" ||
              view.kind === "agent" ? null : activeSession ? (
              <ChatScreen
                models={models}
                key={activeSession.id}
                threadId={activeSession.id}
                workspaceName={activeWorkspace?.name}
                suggestions={
                  desktopState.simulated
                    ? [
                        "打开 Chrome，访问必应并输入 abcd，不提交搜索",
                        "帮我检查网页中的搜索框",
                        "总结一下这个仓库本周的变更",
                      ]
                    : undefined
                }
              />
            ) : null}
          </main>
        </div>
      </SidebarRail>
      <AnimatedModal
        open={experimentSkillId !== null}
        onOpenChange={(open) => {
          if (!open) setExperimentSkillId(null)
        }}
        panelClassName="grid gap-4 p-6"
        panelDataSlot="dialog-content"
        showCloseButton
      >
        <div className="flex flex-col gap-2 pr-8 text-center sm:text-left">
          <AnimatedModalTitle className="text-lg leading-none font-medium">
            选择实验 Agent
          </AnimatedModalTitle>
          <AnimatedModalDescription className="text-sm text-muted-foreground">
            在全新会话中使用此 Skill 的完整当前版本，已有会话的快照保持固定。
          </AnimatedModalDescription>
        </div>
        <div className="space-y-2 text-sm">
          <p>Agent</p>
          <Select
            label="实验 Agent"
            className="block w-full"
            buttonClassName="w-full"
            options={agents.map((agent) => ({
              id: agent.id,
              label: agent.configuration.name,
            }))}
            value={experimentAgentId}
            onValueChange={setExperimentAgentId}
            disabled={!agents.length}
            portal
          />
        </div>
        {!agents.length ? (
          <p className="text-sm text-muted-foreground">
            请先创建一个本地 Agent。
          </p>
        ) : null}
        <Button
          disabled={!experimentAgentId}
          onClick={() => {
            const agent = agents.find((entry) => entry.id === experimentAgentId)
            if (agent && experimentSkillId) {
              startAgentSession(agent, experimentSkillId)
              setExperimentSkillId(null)
            }
          }}
        >
          开始实验会话
        </Button>
      </AnimatedModal>
      <MorphicCommandPalette
        open={skillSearchOpen}
        onOpenChange={setSkillSearchOpen}
        shortcut={false}
        fallbackFocusRef={contentRef}
        items={skillCatalog.map((skill) => ({
          id: skill.id,
          label: skill.name,
          group: "我的技能",
          keywords: [skill.description],
          icon: (
            <HugeiconsIcon
              icon={PackageIcon}
              aria-hidden="true"
              size={16}
              strokeWidth={1.7}
              className="text-muted-foreground"
            />
          ),
          onSelect: () => {
            setOpenedSkillId(skill.id)
            setView({ kind: "skill" })
            setSkillSearchOpen(false)
          },
        }))}
      >
        <MorphicCommandPaletteContent
          title="搜索技能"
          description="搜索并打开技能"
          placeholder="查找技能…"
          emptyMessage="没有找到技能。"
          clearLabel="清空搜索"
          closeLabel="关闭搜索"
          footer={false}
        />
      </MorphicCommandPalette>
      <WorkspacePicker
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null)
        }}
        workspaces={state.workspaces}
        addOnly
        onPick={startSession}
        onAdd={(directory) => startSession(store.addWorkspace(directory).id)}
        fallbackFocusRef={contentRef}
      />
    </>
  )
}

export default App
