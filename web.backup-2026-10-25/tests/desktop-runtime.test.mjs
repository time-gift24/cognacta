import assert from "node:assert/strict"
import { test } from "node:test"
import { createServer } from "vite"

async function load(t) {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  t.after(() => server.close())
  return {
    ...(await server.ssrLoadModule("/src/adapters/demo/desktop.ts")),
    ...(await server.ssrLoadModule("/src/chat/thread-store.ts")),
  }
}
test("demo client settings default to four and remain isolated in memory", async t => {
  const { createDemoDesktopRuntime } = await load(t)
  const first = createDemoDesktopRuntime().desktop, second = createDemoDesktopRuntime().desktop
  assert.deepEqual(await first.readSettings(), { maxConcurrentRuns: 4 })
  const saved = await first.saveSettings({ maxConcurrentRuns: 64 })
  saved.maxConcurrentRuns = 1
  assert.deepEqual(await first.readSettings(), { maxConcurrentRuns: 64 })
  assert.deepEqual(await second.readSettings(), { maxConcurrentRuns: 4 })
  for (const maxConcurrentRuns of [0, 65, 4.5, "8", NaN]) await assert.rejects(first.saveSettings({ maxConcurrentRuns }))
  assert.deepEqual(await first.readSettings(), { maxConcurrentRuns: 64 })
})

const request = (text = "[browser] 打开必应并填写 abcd，不提交") => ({
  messages: [{ role: "user", text }],
})
const collect = async (gateway, text, events = []) => {
  for await (const event of gateway.stream(request(text))) events.push(event)
  return events
}
function until(desktop, predicate) {
  if (predicate(desktop.getState())) return Promise.resolve(desktop.getState())
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error("Desktop state timed out"))
    }, 3000)
    const unsubscribe = desktop.subscribe(() => {
      const state = desktop.getState()
      if (predicate(state)) {
        clearTimeout(timer)
        unsubscribe()
        resolve(state)
      }
    })
  })
}
const pending = (desktop, previousId) =>
  until(
    desktop,
    (state) =>
      state.task?.phase === "awaiting-approval" &&
      state.task.approval.id !== previousId
  )
const decide = (desktop, task, decision = "approve") =>
  desktop.decide({ runId: task.runId, approvalId: task.approval.id, decision })

test("two approvals reserve one global task; duplicate/stale decisions cannot execute twice", async (t) => {
  const { createDemoDesktopRuntime } = await load(t)
  const { desktop, gatewayFor } = createDemoDesktopRuntime({ delayMs: 5 })
  const observed = []
  const result = collect(gatewayFor("a"), undefined, observed)
  const first = (await pending(desktop)).task
  t.after(() => desktop.stop(first.runId))
  assert.equal(desktop.getState().browser.status, "empty")
  assert.equal(desktop.getState().browserRequest, 1)
  assert.equal(
    observed.some((event) => event.type === "part-started"),
    false,
    "waiting for approval must not render an executing tool"
  )
  assert.equal(
    (await collect(gatewayFor("b"), "ordinary message")).at(-1).error.kind,
    "unavailable"
  )
  await assert.rejects(desktop.navigate("https://example.com"), /停止当前任务/)
  await assert.rejects(
    desktop.decide({
      runId: first.runId,
      approvalId: "stale",
      decision: "approve",
    }),
    /失效/
  )
  const duplicate = await Promise.allSettled([
    decide(desktop, first),
    decide(desktop, first),
  ])
  assert.equal(
    duplicate.filter((item) => item.status === "fulfilled").length,
    1
  )
  const second = (await pending(desktop, first.approval.id)).task
  assert.equal(second.runId, first.runId)
  assert.equal(desktop.getState().browser.url, "https://www.bing.com/")
  assert.equal(desktop.getState().browser.preview.field.value, "")
  assert.equal(desktop.getState().browserRequest, 2)
  assert.equal(
    observed.some(
      (event) => event.type === "part-started" && event.partId === 1
    ),
    false
  )
  await assert.rejects(decide(desktop, first), /失效/)
  await decide(desktop, second)
  const events = await result
  assert.equal(events.at(-1).type, "completed")
  assert.match(events.at(-1).response.assistant.parts.at(-1).text, /尚未提交/)
  assert.equal(desktop.getState().browser.preview.field.value, "abcd")
  assert.equal(desktop.getState().task, null)
})

test("rejecting an action proposes a distinct read-only approval without changing the page", async (t) => {
  const { createDemoDesktopRuntime } = await load(t)
  for (const rejectSecond of [false, true]) {
    const { desktop, gatewayFor } = createDemoDesktopRuntime({ delayMs: 1 })
    await desktop.navigate("https://example.com/")
    const observed = []
    const events = collect(gatewayFor("a"), undefined, observed)
    let task = (await pending(desktop)).task
    if (rejectSecond) {
      await decide(desktop, task)
      task = (await pending(desktop, task.approval.id)).task
    }
    const before = desktop.getState().browser
    await decide(desktop, task, "reject")
    const alternative = (await pending(desktop, task.approval.id)).task
    assert.equal(alternative.runId, task.runId)
    assert.equal(alternative.approval.toolName, "browser.inspect")
    assert.notEqual(alternative.approval.id, task.approval.id)
    assert.equal(
      observed.some(
        (event) =>
          event.type === "part-started" && event.name === "browser.inspect"
      ),
      false
    )
    assert.deepEqual(desktop.getState().browser, before)
    await decide(desktop, alternative, rejectSecond ? "approve" : "reject")
    const result = await events
    assert.equal(desktop.getState().task, null)
    assert.deepEqual(desktop.getState().browser, before)
    assert.equal(desktop.getState().browserRequest, rejectSecond ? 4 : 3)
    assert.match(
      result.at(-1).response.assistant.parts.at(-1).text,
      /不会再次申请已拒绝/
    )
    assert.equal(
      result.filter(
        (event) =>
          event.type === "part-completed" &&
          event.content.type === "tool-call" &&
          event.content.call.errorText
      ).length,
      rejectSecond ? 1 : 2
    )
  }
})

test("stop during waiting, submitting and execution releases only its run; late decisions cannot revive it", async (t) => {
  const { createDemoDesktopRuntime } = await load(t)
  for (const phase of ["waiting", "submitting", "executing"]) {
    const { desktop, gatewayFor } = createDemoDesktopRuntime({ delayMs: 15 })
    const events = collect(gatewayFor("old"))
    const task = (await pending(desktop)).task
    let approval
    if (phase !== "waiting") {
      approval = decide(desktop, task).then(
        () => "accepted",
        () => "stopped"
      )
      if (phase === "executing") assert.equal(await approval, "accepted")
      else assert.equal(desktop.getState().task.phase, "submitting")
    }
    const stopping = desktop.stop(task.runId)
    assert.equal(desktop.getState().task.phase, "stopping")
    await stopping
    assert.equal(desktop.getState().task, null)
    assert.equal(desktop.getState().browser.status, "empty")
    assert.equal((await events).at(-1).error.kind, "aborted")
    if (phase === "submitting") assert.equal(await approval, "stopped")
    const next = collect(gatewayFor("new"))
    const nextTask = (await pending(desktop)).task
    await assert.rejects(desktop.stop(task.runId), /任务已结束/)
    await assert.rejects(decide(desktop, task), /失效/)
    assert.equal(desktop.getState().task.runId, nextTask.runId)
    await desktop.stop(nextTask.runId)
    await next
  }
})

test("instances and browser histories are independent; navigation validates URLs and excludes active work", async (t) => {
  const { createDemoDesktopRuntime } = await load(t)
  const a = createDemoDesktopRuntime({ delayMs: 1 })
  const b = createDemoDesktopRuntime({ delayMs: 1 })
  const aEvents = collect(a.gatewayFor("same-thread"))
  const task = (await pending(a.desktop)).task
  const ordinary = await collect(b.gatewayFor("same-thread"), "[fail-send]")
  assert.equal(
    ordinary.at(-1).error.kind,
    "transport",
    "ordinary messages use the existing mock gateway"
  )
  assert.equal(b.desktop.getState().task, null)
  assert.equal(a.desktop.getState().task.runId, task.runId)
  await b.desktop.back()
  await b.desktop.reload()
  const navigation = b.desktop.navigate("example.com")
  assert.equal(
    (await collect(b.gatewayFor("during-navigation"))).at(-1).error.kind,
    "unavailable"
  )
  await navigation
  await b.desktop.navigate("https://www.bing.com/")
  assert.equal(b.desktop.getState().browser.canGoBack, true)
  await b.desktop.back()
  assert.equal(b.desktop.getState().browser.url, "https://example.com/")
  assert.equal(b.desktop.getState().browser.canGoForward, true)
  await b.desktop.forward()
  await b.desktop.reload()
  assert.equal(b.desktop.getState().browser.url, "https://www.bing.com/")
  for (const url of [
    "javascript:alert(1)",
    "file:///tmp/demo",
    "https://user:pass@example.com/",
  ]) {
    await assert.rejects(b.desktop.navigate(url), /HTTP/)
    assert.equal(b.desktop.getState().browser.url, "https://www.bing.com/")
  }
  await b.desktop.back()
  await b.desktop.navigate("https://example.org/")
  assert.equal(b.desktop.getState().browser.canGoForward, false)
  assert.equal(a.desktop.getState().browser.status, "empty")
  await a.desktop.stop(task.runId)
  await aEvents
})

test("direct desktop stop settles ThreadStore; ordinary mock stop drains before another task takes over", async (t) => {
  const { createDemoDesktopRuntime, ThreadStoreImpl } = await load(t)
  const { desktop, gatewayFor } = createDemoDesktopRuntime({ delayMs: 10 })
  const store = new ThreadStoreImpl("browser", gatewayFor("browser"))
  store.send("[browser]")
  const task = (await pending(desktop)).task
  await desktop.stop(task.runId)
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(store.streaming, false)
  assert.equal(store.getState().messages.at(-1).state, "stopped")
  assert.notEqual(store.getState().error?.kind, "truncated")

  const events = collect(gatewayFor("ordinary"), "[slow] ordinary text")
  const run = desktop.getState().task
  await new Promise((resolve) => setTimeout(resolve, 0))
  const phases = []
  const unsubscribe = desktop.subscribe(() =>
    phases.push(desktop.getState().task?.phase ?? "released")
  )
  await desktop.stop(run.runId)
  unsubscribe()
  assert.deepEqual(phases, ["stopping", "released"])
  assert.equal((await events).at(-1).error.kind, "aborted")
  const next = collect(gatewayFor("next"))
  const nextTask = (await pending(desktop)).task
  assert.equal(desktop.getState().browser.status, "empty")
  assert.notEqual(nextTask.runId, run.runId)
  await desktop.stop(nextTask.runId)
  await next
})

test("manual operations have separate history and remain usable while an Agent task owns Chrome", async t => {
  const { createDemoDesktopRuntime } = await load(t)
  const { desktop, gatewayFor } = createDemoDesktopRuntime({ delayMs: 1 })
  const events = collect(gatewayFor("agent"))
  const task = (await pending(desktop)).task
  const chrome = desktop.getState().browser
  await desktop.operationsNavigate("ops.test")
  await desktop.operationsNavigate("ops.test/next")
  await desktop.operationsBack()
  assert.equal(desktop.getState().operationsBrowser.url, "https://ops.test/")
  assert.equal(desktop.getState().operationsBrowser.canGoForward, true)
  assert.equal(desktop.getState().browser, chrome)
  assert.equal(desktop.getState().task.runId, task.runId)
  await desktop.operationsForward(); await desktop.operationsReload()
  assert.equal(desktop.getState().operationsBrowser.url, "https://ops.test/next")
  await assert.rejects(desktop.operationsNavigate("file:///private"), /HTTP/)
  await desktop.stop(task.runId); await events
})
