import type { ChatEvent, ChatRequest } from "@/chat/dto"
import type { ChatGateway } from "@/chat/gateway"
import type {
  ApprovalDecision,
  BrowserViewport,
  DesktopRuntime,
  DesktopSettings,
  DesktopSnapshot,
  DesktopTask,
} from "@/desktop/runtime"
import {
  object,
  readBrowserSnapshot,
  readChatEvent,
  readDesktopSnapshot,
  readRpcError,
  string,
} from "./protocol"
import { safeHttpUrl, serializeRequest } from "./attachments"

/** The SDK boundary is injected so the same lifecycle is tested without a native window. */
export interface TauriBridge {
  invoke(command: string, args?: Record<string, unknown>): Promise<unknown>
  listen(
    event: string,
    handler: (payload: unknown) => void
  ): Promise<() => void>
}
export type RunContext = {
  workspacePath?: string
  agentId?: string
  experimentSkillId?: string
  instructions?: string
}
type PendingRun = {
  runId: string
  threadId: string
  events: ChatEvent[]
  wake?: () => void
  terminal: boolean
  stopping: boolean
  started: boolean
  start?: Promise<void>
}
const initialState: DesktopSnapshot = {
  simulated: false,
  tasks: [],
  browserThreadId: null,
  task: null,
  browserRequest: 0,
  browser: {
    url: "",
    title: "",
    status: "empty",
    canGoBack: false,
    canGoForward: false,
  },
}
const failure = (
  message: string,
  kind:
    | "transport"
    | "invalid-request"
    | "aborted"
    | "invalid-response" = "transport"
): ChatEvent => ({ type: "failed", error: { kind, message } })

function readSettings(value: unknown): DesktopSettings {
  const { maxConcurrentRuns } = object(value)
  if (
    typeof maxConcurrentRuns !== "number" ||
    !Number.isSafeInteger(maxConcurrentRuns) ||
    maxConcurrentRuns < 1 ||
    maxConcurrentRuns > 64
  )
    throw new Error("并发上限必须是 1 到 64 的整数。")
  return { maxConcurrentRuns }
}

export function createTauriRuntime(bridge: TauriBridge) {
  let state = initialState
  let version = 0
  let operationsVersion = 0
  let disposed = false
  let connected = false
  let unavailable = false
  let unlisten: (() => void) | undefined
  let resolveContext: (
    threadId: string
  ) => Promise<RunContext> = async () => ({})
  const listeners = new Set<() => void>()
  const runs = new Map<string, PendingRun>()
  const pendingStop = new Map<string, { confirmation?: Promise<void> }>()
  const terminalRuns = new Set<string>()
  const request = (method: string, params: Record<string, unknown> = {}) =>
    bridge.invoke("runtime_request", { method, params })
  const tasksOf = (snapshot = state) =>
    snapshot.tasks ?? (snapshot.task ? [snapshot.task] : [])
  const publish = (next: DesktopSnapshot) => {
    if (next.operationsBrowser !== state.operationsBrowser) operationsVersion++
    const tasks = tasksOf(next)
    const browserThreadId =
      next.browserThreadId === undefined
        ? (next.task?.threadId ?? null)
        : next.browserThreadId
    state = {
      ...next,
      tasks,
      browserThreadId,
      task: tasks.find((task) => task.threadId === browserThreadId) ?? null,
    }
    version++
    for (const listener of [...listeners]) listener()
  }
  const updateTask = (task: DesktopTask) =>
    publish({
      ...state,
      tasks: tasksOf().map((current) =>
        current.runId === task.runId ? task : current
      ),
    })
  const clearTask = (runId: string) => {
    terminalRuns.add(runId)
    const tasks = tasksOf().filter((task) => task.runId !== runId)
    if (tasks.length !== tasksOf().length)
      publish({
        ...state,
        tasks,
        closeBlocked: tasks.length ? state.closeBlocked : false,
      })
  }
  const push = (run: PendingRun, event: ChatEvent) => {
    if (run.terminal) return
    run.events.push(event)
    if (event.type === "completed" || event.type === "failed") {
      run.terminal = true
      terminalRuns.add(run.runId)
      if (!run.stopping) clearTask(run.runId)
    }
    run.wake?.()
    run.wake = undefined
  }
  const disconnected = (message: string) => {
    connected = false
    unavailable = true
    pendingStop.clear()
    for (const run of runs.values()) push(run, failure(message))
    publish({
      ...state,
      tasks: [],
      task: null,
      closeBlocked: false,
      browser: { ...state.browser, status: "error", error: message },
    })
  }
  const onEvent = (value: unknown) => {
    if (disposed || unavailable) return
    try {
      const event = object(value)
      if (event.event === "exit_blocked") {
        publish({ ...state, closeBlocked: true })
        return
      }
      if (event.event === "operations_browser_state") {
        try {
          publish({
            ...state,
            operationsBrowser: readBrowserSnapshot(event.state),
          })
        } catch {
          publish({
            ...state,
            operationsBrowser: {
              ...initialState.browser,
              status: "error",
              error: "运维浏览器返回了无效数据，请重新打开面板。",
            },
          })
        }
        return
      }
      if (event.event === "desktop_state") {
        const snapshot = readDesktopSnapshot(event.state)
        if (object(event.state).browserThreadId === undefined)
          snapshot.browserThreadId =
            state.browserThreadId ?? snapshot.browserThreadId
        const tasks = tasksOf(snapshot).filter(
          (task) => !terminalRuns.has(task.runId)
        )
        for (const task of tasksOf()) {
          const run = runs.get(task.runId)
          const stopping = pendingStop.get(task.runId)
          if (stopping || (run && (!run.terminal || run.stopping))) {
            const index = tasks.findIndex(
              (current) => current.runId === task.runId
            )
            const retained = stopping?.confirmation
              ? { ...task, phase: "stopping" as const }
              : task
            if (index < 0) tasks.push(retained)
            else if (stopping || run?.stopping) tasks[index] = retained
          }
        }
        publish({
          ...snapshot,
          tasks,
          closeBlocked: tasks.length
            ? state.closeBlocked || snapshot.closeBlocked
            : false,
        })
      } else if (event.event === "chat_event") {
        const run = runs.get(string(event.runId))
        if (run && run.threadId === event.threadId)
          push(run, readChatEvent(event.data))
      } else if (
        event.event === "runtime_exit" ||
        event.event === "runtime_error"
      )
        disconnected("桌面服务已断开，请重新打开应用。")
    } catch {
      disconnected("桌面服务返回了无效数据，请重新打开应用。")
    }
  }
  const stop = (runId: string): Promise<void> => {
    const pending = pendingStop.get(runId)?.confirmation
    if (pending) return pending
    const run = runs.get(runId)
    const previous = tasksOf().find((task) => task.runId === runId)
    if (!previous) return Promise.reject(new Error("这个任务已结束。"))
    const owner = {
      confirmation: undefined as Promise<void> | undefined,
    }
    pendingStop.set(runId, owner)
    if (run) run.stopping = true
    updateTask({ ...previous, phase: "stopping", error: undefined })
    const stopping = (async () => {
      if (run) await run.start
      // Even a terminal stream event cannot substitute for the stop acknowledgement.
      if (!run || run.started) await request("stop", { runId })
      if (pendingStop.get(runId) === owner) pendingStop.delete(runId)
      if (run) {
        run.stopping = false
        if (!run.terminal) push(run, failure("任务已停止。", "aborted"))
        runs.delete(runId)
      }
      clearTask(runId)
    })().catch(() => {
      if (pendingStop.get(runId) === owner) owner.confirmation = undefined
      if (unavailable) {
        clearTask(runId)
        return
      }
      if (tasksOf().some((task) => task.runId === runId))
        updateTask({
          ...previous,
          ...(run?.terminal ? { phase: "running", approval: undefined } : {}),
          error: "停止未能完成，请重试。",
        })
      throw new Error("停止未能完成，请重试。")
    })
    owner.confirmation = stopping
    return stopping
  }
  const navigating = new Set<string | null>()
  const navigate = async (method: string, params?: Record<string, unknown>) => {
    if (!connected) throw new Error("桌面服务未连接。")
    const threadId = state.browserThreadId ?? null
    if (state.task || navigating.has(threadId))
      throw new Error("请等待当前任务或页面加载结束。")
    navigating.add(threadId)
    try {
      await request(method, { ...params, threadId })
    } catch {
      throw new Error("浏览器操作未能完成，请重试。")
    } finally {
      navigating.delete(threadId)
    }
  }
  let browserSelection = 0
  let operationsNavigating = false
  const operationsNavigation = async (method: string, params = {}) => {
    if (!connected || disposed) throw new Error("桌面服务未连接。")
    if (operationsNavigating)
      throw new Error("运维浏览器正在导航，请稍后再试。")
    operationsNavigating = true
    try {
      await request(method, params)
    } catch {
      throw new Error("运维浏览器操作失败，请重试。")
    } finally {
      operationsNavigating = false
    }
  }
  let viewport: BrowserViewport | null = null
  let viewportKey = ""
  let viewportWrite: Promise<void> | undefined
  let viewportVersion = 0
  const setBrowserViewport = (
    bounds: BrowserViewport | null
  ): Promise<void> => {
    const key = JSON.stringify(bounds)
    if (key === viewportKey) return viewportWrite ?? Promise.resolve()
    viewportKey = key
    viewport = bounds
    viewportVersion++
    if (!viewportWrite) {
      viewportWrite = Promise.resolve().then(async () => {
        try {
          let sent = -1
          while (sent !== viewportVersion) {
            sent = viewportVersion
            await bridge.invoke("browser_set_bounds", {
              bounds: viewport
                ? {
                    ...viewport,
                    pageId: "__manual__",
                    visible: true,
                    interactive: true,
                  }
                : {
                    pageId: "__manual__",
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    visible: false,
                    interactive: false,
                  },
            })
          }
        } catch {
          viewportKey = ""
          throw new Error("运维浏览器画面暂时无法显示，请重新打开面板。")
        } finally {
          viewportWrite = undefined
        }
      })
    }
    return viewportWrite
  }
  const desktop: DesktopRuntime = {
    setBrowserViewport,
    async readOperationsBrowser() {
      if (!connected || disposed) throw new Error("桌面服务未连接。")
      try {
        const before = operationsVersion
        const browser = readBrowserSnapshot(
          await request("operations_browser_status")
        )
        if (operationsVersion === before)
          publish({ ...state, operationsBrowser: browser })
        return browser
      } catch {
        throw new Error("运维浏览器暂不可用，请重新打开面板。")
      }
    },
    async operationsNavigate(url) {
      await operationsNavigation("operations_browser_navigate", {
        url: safeHttpUrl(url, true),
      })
    },
    operationsBack: () => operationsNavigation("operations_browser_back"),
    operationsForward: () => operationsNavigation("operations_browser_forward"),
    operationsReload: () => operationsNavigation("operations_browser_reload"),
    async readSettings() {
      if (!connected || disposed) throw new Error("桌面服务未连接。")
      try {
        return readSettings(await request("settings_get"))
      } catch {
        throw new Error("客户端设置读取失败，请重试。")
      }
    },
    async saveSettings(settings) {
      const validated = readSettings(settings)
      if (!connected || disposed) throw new Error("桌面服务未连接。")
      try {
        return readSettings(
          await request("settings_save", { settings: validated })
        )
      } catch {
        throw new Error("客户端设置保存失败，原设置仍生效，请重试。")
      }
    },
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async selectBrowserThread(threadId, options) {
      const focus = options?.focus
      if (focus !== undefined && typeof focus !== "boolean")
        throw new Error("Chrome 聚焦选项必须是布尔值。")
      if (!connected || disposed) throw new Error("桌面服务未连接。")
      const selection = ++browserSelection
      try {
        await request("browser_select", {
          threadId,
          ...(focus === undefined ? {} : { focus }),
        })
        if (selection === browserSelection && !unavailable)
          publish({ ...state, browserThreadId: threadId })
      } catch {
        throw new Error("浏览器会话切换失败，请重试。")
      }
    },
    decide: async (decision: ApprovalDecision) => {
      const task = tasksOf().find((task) => task.runId === decision.runId)
      if (
        !task ||
        task.runId !== decision.runId ||
        task.approval?.id !== decision.approvalId ||
        task.phase !== "awaiting-approval"
      )
        throw new Error("此操作已更新，请查看当前待批准操作。")
      updateTask({ ...task, phase: "submitting", error: undefined })
      try {
        await request("decide", { ...decision })
      } catch {
        const current = tasksOf().find(
          (current) => current.runId === task.runId
        )
        if (
          current?.approval?.id === task.approval?.id &&
          current?.phase === "submitting"
        )
          updateTask(task)
        throw new Error("审批未能提交，内容已保留，请重试。")
      }
    },
    stop,
    navigate: (url) => navigate("navigate", { url: safeHttpUrl(url, true) }),
    back: () => navigate("back"),
    forward: () => navigate("forward"),
    reload: () => navigate("reload"),
  }
  const gatewayFor = (threadId: string): ChatGateway => {
    let currentRun: PendingRun | undefined
    return {
      appendOnly: true,
      async *stream(input: ChatRequest) {
        if (!connected || disposed) {
          yield failure("桌面服务未连接，请重新打开应用。")
          return
        }
        if (
          tasksOf().some((task) => task.threadId === threadId) ||
          navigating.has(threadId)
        ) {
          yield failure("此会话有任务正在执行，请等待结束。", "invalid-request")
          return
        }
        const run: PendingRun = {
          runId: crypto.randomUUID(),
          threadId,
          events: [],
          terminal: false,
          stopping: false,
          started: false,
        }
        runs.set(run.runId, run)
        currentRun = run
        publish({
          ...state,
          tasks: [
            ...tasksOf(),
            {
              runId: run.runId,
              threadId,
              title: input.messages.at(-1)?.text.slice(0, 80) ?? "正在执行任务",
              phase: "preparing",
            },
          ],
          closeBlocked: false,
        })
        run.start = (async () => {
          let serialized, context
          try {
            await bridge.invoke("runtime_prepare_run", {
              runId: run.runId,
              threadId,
            })
            serialized = await serializeRequest(input)
            context = await resolveContext(threadId)
          } catch (error) {
            push(
              run,
              failure(
                error instanceof Error ? error.message : "任务输入不可用。",
                "invalid-request"
              )
            )
            await bridge
              .invoke("runtime_release_run", { runId: run.runId })
              .catch(() => {})
            return
          }
          if (run.stopping || run.terminal || disposed) {
            push(run, failure("任务已停止。", "aborted"))
            await bridge
              .invoke("runtime_release_run", { runId: run.runId })
              .catch(() => {})
            return
          }
          try {
            const { instructions, ...scope } = context
            // The subscription and queue already exist before this command can emit.
            const ack = object(
              await request("chat_start", {
                runId: run.runId,
                threadId,
                ...scope,
                request: {
                  ...serialized,
                  instructions:
                    [instructions, input.instructions]
                      .filter(Boolean)
                      .join("\n\n") || undefined,
                },
              })
            )
            if (ack.runId !== run.runId)
              throw new Error("invalid acknowledgement")
            run.started = true
          } catch (error) {
            push(run, {
              type: "failed",
              error: readRpcError(error, "任务未能连接桌面服务，请重试。"),
            })
            await bridge
              .invoke("runtime_release_run", { runId: run.runId })
              .catch(() => {})
          }
        })()
        try {
          while (true) {
            if (!run.events.length && !run.terminal)
              await new Promise<void>((resolve) => {
                run.wake = resolve
              })
            const event = run.events.shift()
            if (event) yield event
            if (run.terminal && !run.events.length) return
          }
        } finally {
          if (!run.stopping) runs.delete(run.runId)
          if (currentRun === run && !run.stopping) currentRun = undefined
        }
      },
      abort: () => (currentRun ? stop(currentRun.runId) : Promise.resolve()),
    }
  }
  return {
    desktop,
    gatewayFor,
    request,
    setContextResolver(resolver: typeof resolveContext) {
      resolveContext = resolver
    },
    async initialize() {
      unlisten = await bridge.listen("runtime-event", onEvent)
      const before = version
      try {
        const snapshot = readDesktopSnapshot(await request("status"))
        if (unavailable) throw new Error("runtime unavailable")
        if (version === before) publish(snapshot)
        connected = true
      } catch {
        unlisten()
        unlisten = undefined
        throw new Error("桌面服务启动失败，请检查本地运行环境后重新打开应用。")
      }
    },
    dispose() {
      disposed = true
      unlisten?.()
      disconnected("桌面连接已关闭。")
      listeners.clear()
      void setBrowserViewport(null).catch(() => {})
    },
  }
}
