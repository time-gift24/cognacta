import type { ChatEvent, ChatRequest, OutputContent } from "@/chat/dto"
import type { ChatGateway } from "@/chat/gateway"
import type {
  ApprovalDecision,
  ApprovalRequest,
  BrowserSnapshot,
  DesktopRuntime,
  DesktopSnapshot,
} from "@/desktop/runtime"
import { createMockGateway } from "./chat"

type Page = Pick<BrowserSnapshot, "url" | "title" | "preview">
type Decision = Pick<ApprovalDecision, "decision" | "reason">
type Run = {
  id: string
  threadId: string
  stopped: boolean
  abort: () => void
  wake: Set<() => void>
  finished: Promise<void>
  finishWork: () => void
  approval?: {
    id: string
    resolve: (decision: Decision | null) => void
  }
  stopping?: Promise<void>
}

export function createDemoDesktopRuntime(options: { delayMs?: number } = {}): {
  desktop: DesktopRuntime
  gatewayFor(threadId: string): ChatGateway
} {
  const delay = options.delayMs ?? 350
  let maxConcurrentRuns = 4
  const listeners = new Set<() => void>()
  let state: DesktopSnapshot = {
    simulated: true,
    task: null,
    browserRequest: 0,
    operationsBrowser: { url: "", title: "", status: "empty", canGoBack: false, canGoForward: false },
    browser: {
      url: "",
      title: "浏览器未打开",
      status: "empty",
      canGoBack: false,
      canGoForward: false,
    },
  }
  let active: Run | undefined
  let navigating = false
  const history: Page[] = []
  let position = -1
  const operationsHistory: Page[] = []
  let operationsPosition = -1
  let operationsNavigating = false
  const publish = (patch: Partial<DesktopSnapshot>) => {
    state = { ...state, ...patch }
    for (const listener of [...listeners]) listener()
  }
  const current = (run: Run) => active === run && !run.stopped
  const finish = (run: Run) => {
    if (active !== run) return
    active = undefined
    publish({ task: null })
  }
  const pause = (run: Run) =>
    new Promise<void>((resolve) => {
      if (!current(run)) return resolve()
      const done = () => {
        clearTimeout(timer)
        run.wake.delete(done)
        resolve()
      }
      const timer = setTimeout(done, delay)
      run.wake.add(done)
    })
  const pageFor = (url: string): Page => {
    const host = new URL(url).hostname
    const bing = host === "bing.com" || host.endsWith(".bing.com")
    return {
      url,
      title: bing ? "Bing" : host,
      preview: {
        heading: bing ? "Bing" : host,
        text: "演示页面，用于预览浏览器操作与审批流程；未连接真实网站。",
        ...(bing ? { field: { label: "搜索", value: "" } } : {}),
      },
    }
  }
  const showPage = () =>
    publish({
      browser: {
        ...history[position],
        status: "ready",
        canGoBack: position > 0,
        canGoForward: position < history.length - 1,
      },
    })
  const openPage = (page: Page) => {
    history.splice(position + 1, history.length, page)
    position += 1
    showPage()
  }
  const requestApproval = (run: Run, approval: ApprovalRequest) =>
    new Promise<Decision | null>((resolve) => {
      if (!current(run)) return resolve(null)
      run.approval = { id: approval.id, resolve }
      publish({
        browserRequest: state.browserRequest + 1,
        task: {
          ...state.task!,
          phase: "awaiting-approval",
          approval,
          error: undefined,
        },
      })
    })

  async function* browserTask(
    run: Run,
    request: ChatRequest
  ): AsyncGenerator<ChatEvent> {
    const metadata = {
      providerName: "演示",
      protocolName: "desktop.demo",
      requestedModel: request.model ?? "demo",
    }
    const parts: OutputContent[] = []
    yield { type: "started", metadata }
    const operations = [
      {
        title: "打开必应",
        description: "在 Agent 的 Chrome 中打开必应首页。",
        toolName: "browser.navigate",
        parameters: JSON.stringify({ url: "https://www.bing.com/" }, null, 2),
        code: 'await page.goto("https://www.bing.com/");',
      },
      {
        title: "填写搜索内容",
        description: "在搜索框中填写 abcd，不提交搜索。",
        toolName: "browser.fill",
        parameters: JSON.stringify(
          { field: "搜索", value: "abcd", submit: false },
          null,
          2
        ),
        code: 'await page.getByRole("searchbox").fill("abcd");',
      },
    ]
    let summary =
      "固定演示已完成：浏览器已打开必应，搜索框填入 abcd，尚未提交搜索。此演示尚未根据输入执行真实网站任务。"
    let lastPartId = 0
    let rejected = false
    for (const [partId, operation] of operations.entries()) {
      lastPartId = partId
      if (!current(run)) return
      const approval = {
        ...operation,
        id: crypto.randomUUID(),
        callId: crypto.randomUUID(),
        targetUrl: "https://www.bing.com/",
      }
      const response = await requestApproval(run, approval)
      if (!current(run) || response === null) return
      const { decision, reason } = response
      yield {
        type: "part-started",
        partId,
        kind: "tool-call",
        name: operation.toolName,
      }
      yield { type: "delta", partId, text: operation.parameters }
      await pause(run)
      if (!current(run)) return
      if (decision === "approve") {
        if (partId === 0) openPage(pageFor("https://www.bing.com/"))
        else {
          const page = history[position]
          history[position] = {
            ...page,
            preview: {
              ...page.preview!,
              field: { label: "搜索", value: "abcd" },
            },
          }
          showPage()
        }
      } else rejected = true
      const content: OutputContent = {
        type: "tool-call",
        call: {
          callId: approval.callId,
          name: operation.toolName,
          inputText: operation.parameters,
          ...(decision === "approve"
            ? { output: { simulated: true, result: operation.title } }
            : {
                errorText: reason?.trim()
                  ? `用户拒绝此操作：${reason.trim()}`
                  : "用户拒绝此操作",
              }),
        },
      }
      parts.push(content)
      yield { type: "part-completed", partId, content }
      if (decision === "reject") break
    }
    if (rejected && current(run)) {
      const partId = ++lastPartId
      const approval: ApprovalRequest = {
        id: crypto.randomUUID(),
        callId: crypto.randomUUID(),
        title: "只读取当前页面",
        description: "改为只读取当前页面标题与网址，不导航、不填写，也不提交。",
        toolName: "browser.inspect",
        parameters: JSON.stringify(
          { scope: "current-page", readOnly: true },
          null,
          2
        ),
        code: "return { title: await page.title(), url: page.url() };",
        ...(state.browser.url ? { targetUrl: state.browser.url } : {}),
      }
      const response = await requestApproval(run, approval)
      if (!current(run) || response === null) return
      const { decision, reason } = response
      yield {
        type: "part-started",
        partId,
        kind: "tool-call",
        name: approval.toolName,
      }
      yield { type: "delta", partId, text: approval.parameters }
      await pause(run)
      if (!current(run)) return
      const content: OutputContent = {
        type: "tool-call",
        call: {
          callId: approval.callId,
          name: approval.toolName,
          inputText: approval.parameters,
          ...(decision === "approve"
            ? {
                output: {
                  simulated: true,
                  title: state.browser.title,
                  url: state.browser.url,
                },
              }
            : {
                errorText: reason?.trim()
                  ? `用户拒绝只读操作：${reason.trim()}`
                  : "用户拒绝只读操作",
              }),
        },
      }
      parts.push(content)
      yield { type: "part-completed", partId, content }
      summary =
        decision === "approve"
          ? `已改为只读检查当前演示页面：${state.browser.title}。页面保持原样；不会再次申请已拒绝的操作。`
          : "你也拒绝了只读检查。没有其他可继续的演示操作，本次任务结束；不会再次申请已拒绝的操作。"
    }
    if (!current(run)) return
    const content: OutputContent = { type: "text", text: summary }
    parts.push(content)
    yield { type: "part-started", partId: lastPartId + 1, kind: "text" }
    yield { type: "delta", partId: lastPartId + 1, text: summary }
    yield { type: "part-completed", partId: lastPartId + 1, content }
    yield {
      type: "completed",
      response: {
        assistant: { parts },
        finish: { reason: "stop" },
        usage: {},
        metadata,
      },
    }
  }

  function navigationUrl(input: string) {
    const value = input.trim()
    let url: URL
    try {
      url = new URL(
        /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`
      )
    } catch {
      throw new Error("请输入有效的网址。")
    }
    if (
      !value ||
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error("请输入不含登录信息的 HTTP 或 HTTPS 网址。")
    }
    return url
  }
  const showOperationsPage = () => publish({ operationsBrowser: {
    ...operationsHistory[operationsPosition], status: "ready",
    canGoBack: operationsPosition > 0,
    canGoForward: operationsPosition < operationsHistory.length - 1,
  } })
  async function navigateOperations(action: () => void) {
    if (operationsNavigating) throw new Error("运维浏览器正在导航，请稍后再试。")
    operationsNavigating = true
    publish({ operationsBrowser: { ...state.operationsBrowser!, status: "loading", error: undefined } })
    try { await new Promise((resolve) => setTimeout(resolve, delay)); action() }
    finally { operationsNavigating = false }
  }

  const desktop: DesktopRuntime = {
    setBrowserViewport: async () => {},
    readOperationsBrowser: async () => state.operationsBrowser!,
    async operationsNavigate(input) {
      const url = navigationUrl(input)
      await navigateOperations(() => {
        operationsHistory.splice(operationsPosition + 1, operationsHistory.length, pageFor(url.href))
        operationsPosition++
        showOperationsPage()
      })
    },
    async operationsBack() {
      if (operationsPosition >= 0) await navigateOperations(() => {
        if (operationsPosition > 0) operationsPosition--
        showOperationsPage()
      })
    },
    async operationsForward() {
      if (operationsPosition >= 0) await navigateOperations(() => {
        if (operationsPosition < operationsHistory.length - 1) operationsPosition++
        showOperationsPage()
      })
    },
    async operationsReload() {
      if (operationsPosition >= 0) await navigateOperations(showOperationsPage)
    },

    async readSettings() {
      return { maxConcurrentRuns }
    },
    async saveSettings(settings) {
      if (
        !Number.isSafeInteger(settings.maxConcurrentRuns) ||
        settings.maxConcurrentRuns < 1 ||
        settings.maxConcurrentRuns > 64
      )
        throw new Error("并发上限必须是 1 到 64 的整数。")
      maxConcurrentRuns = settings.maxConcurrentRuns
      return { maxConcurrentRuns }
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async decide(decision: ApprovalDecision) {
      const run = active
      if (
        !run ||
        run.id !== decision.runId ||
        run.approval?.id !== decision.approvalId ||
        state.task?.phase !== "awaiting-approval"
      )
        throw new Error("这项审批已失效或已提交。")
      if (!["approve", "reject"].includes(decision.decision))
        throw new Error("请选择允许或拒绝此操作。")
      if (
        decision.reason !== undefined &&
        (typeof decision.reason !== "string" || decision.reason.length > 4000)
      ) {
        throw new Error("反馈最多 4000 字符。")
      }
      publish({
        task: { ...state.task, phase: "submitting", error: undefined },
      })
      await pause(run)
      if (!current(run)) throw new Error("任务已停止，这项审批不再执行。")
      const approval = run.approval!
      run.approval = undefined
      publish({
        task: { ...state.task!, phase: "running", approval: undefined },
      })
      approval.resolve({ decision: decision.decision, reason: decision.reason })
    },
    stop(runId) {
      const run = active
      if (!run) return Promise.resolve()
      if (run.id !== runId)
        return Promise.reject(new Error("这项任务已结束，请停止当前任务。"))
      if (run.stopping) return run.stopping
      run.stopped = true
      run.stopping = run.finished.then(() => {
        finish(run)
      })
      publish({
        task: {
          ...state.task!,
          phase: "stopping",
          approval: undefined,
          error: undefined,
        },
      })
      run.abort()
      run.approval?.resolve(null)
      run.approval = undefined
      for (const wake of [...run.wake]) wake()
      return run.stopping
    },
    async navigate(input) {
      const url = navigationUrl(input)
      await navigate(() => {
        openPage(pageFor(url.href))
      })
    },
    async back() {
      assertNavigationAllowed()
      if (position >= 0)
        await navigate(() => {
          if (position > 0) position -= 1
          showPage()
        })
    },
    async forward() {
      assertNavigationAllowed()
      if (position >= 0)
        await navigate(() => {
          if (position < history.length - 1) position += 1
          showPage()
        })
    },
    async reload() {
      assertNavigationAllowed()
      if (position >= 0)
        await navigate(() => {
          history[position] = pageFor(history[position].url)
          showPage()
        })
    },
  }
  function assertNavigationAllowed() {
    if (active) throw new Error("请先停止当前任务，再手动导航。")
    if (navigating) throw new Error("浏览器正在导航，请稍后再试。")
  }
  async function navigate(action: () => void) {
    assertNavigationAllowed()
    navigating = true
    publish({
      browserRequest: state.browserRequest + 1,
      browser: { ...state.browser, status: "loading", error: undefined },
    })
    try {
      await new Promise((resolve) => setTimeout(resolve, delay))
      action()
    } finally {
      navigating = false
    }
  }

  return {
    desktop,
    gatewayFor(threadId) {
      const mock = createMockGateway({ delayMs: options.delayMs })
      let ownRun: Run | undefined
      return {
        stream(request) {
          async function* consume(): AsyncGenerator<ChatEvent> {
            if (active || navigating) {
              yield {
                type: "failed",
                error: {
                  kind: "unavailable",
                  message: active
                    ? "另一项任务仍在进行，请先停止或等待完成。"
                    : "浏览器正在导航，请稍后再试。",
                },
              }
              return
            }
            const text = request.messages
              .map((message) => message.text)
              .join("\n")
            let finishWork = () => {}
            const finished = new Promise<void>((resolve) => {
              finishWork = resolve
            })
            const run: Run = {
              id: crypto.randomUUID(),
              threadId,
              stopped: false,
              abort: () => {
                void mock.abort()
              },
              wake: new Set(),
              finished,
              finishWork,
            }
            active = ownRun = run
            publish({
              task: {
                runId: run.id,
                threadId,
                title: text.slice(0, 60),
                phase: "running",
              },
            })
            try {
              const stream = /浏览器|网页|打开|bing|\[browser\]/i.test(text)
                ? browserTask(run, request)
                : mock.stream(request)
              for await (const event of stream) {
                if (!current(run)) break
                if (event.type === "completed" || event.type === "failed")
                  finish(run)
                yield event
              }
              run.finishWork()
              if (run.stopped) {
                await run.stopping
                yield {
                  type: "failed",
                  error: { kind: "aborted", message: "任务已停止。" },
                }
              }
            } finally {
              run.finishWork()
              if (!run.stopped) finish(run)
              if (ownRun === run) ownRun = undefined
            }
          }
          return consume()
        },
        abort() {
          return ownRun ? desktop.stop(ownRun.id) : Promise.resolve()
        },
      }
    },
  }
}
