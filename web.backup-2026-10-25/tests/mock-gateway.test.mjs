import assert from "node:assert/strict"
import { test } from "node:test"
import { createServer } from "vite"

async function loadModules(t) {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  t.after(() => server.close())
  const { createMockGateway } = await server.ssrLoadModule(
    "/src/adapters/demo/chat.ts"
  )
  const { ThreadStoreImpl } = await server.ssrLoadModule(
    "/src/chat/thread-store.ts"
  )
  return { createMockGateway, ThreadStoreImpl }
}

const request = { messages: [{ role: "user", text: "[burst] 检查构建缓存" }] }

test("burst 增量保留中文、emoji 和完整 Markdown，与最终回复一致", async (t) => {
  const { createMockGateway } = await loadModules(t)
  const events = []
  for await (const event of createMockGateway({ delayMs: 0 }).stream(request))
    events.push(event)
  const chunks = events.filter(
    (event) => event.type === "delta" && event.partId === 3
  )
  const text = chunks.map((event) => event.text).join("")
  assert.ok(Array.from(text).length > 10000)
  assert.ok(chunks.every((event) => event.text.isWellFormed()))
  assert.match(text, /🔍[\s\S]*```ts[\s\S]*```[\s\S]*✅/)
  assert.match(text, /缓存暂时不可用/)
  assert.match(text, /难以确认收益。$/)
  assert.equal(
    events.find(
      (event) => event.type === "part-completed" && event.partId === 3
    ).content.text,
    text
  )
  assert.equal(events.at(-1).type, "completed")
  assert.equal(events.at(-1).response.assistant.parts.find(part => part.type === "text").text, text)
  assert.deepEqual(events.at(-1).response.assistant.parts, events.filter(event => event.type === "part-completed").map(event => event.content))
})

test("burst 在思考结束、正文中途、最后一段或 usage 后 abort 均不再输出事件", async (t) => {
  const { createMockGateway } = await loadModules(t)
  let reasoningDeltas = 0
  for await (const event of createMockGateway({ delayMs: 0 }).stream(request)) {
    if (event.type === "delta" && event.partId === 0) reasoningDeltas++
    if (event.type === "part-completed" && event.partId === 0) break
  }
  assert.ok(reasoningDeltas > 0)
  for (const boundary of ["last-reasoning-delta", "first-delta", "last-delta", "usage"]) {
    const gateway = createMockGateway({ delayMs: 0 })
    const stream = gateway.stream(request)
    let receivedReasoningDeltas = 0
    while (true) {
      const { value: event, done } = await stream.next()
      assert.equal(done, false, `missing abort boundary: ${boundary}`)
      const textDelta = event.type === "delta" && event.partId === 3
      if (event.type === "delta" && event.partId === 0) receivedReasoningDeltas++
      if (
        (boundary === "last-reasoning-delta" &&
          event.type === "delta" && event.partId === 0 &&
          receivedReasoningDeltas === reasoningDeltas) ||
        (boundary === "first-delta" && textDelta) ||
        (boundary === "last-delta" &&
          textDelta &&
          event.text.endsWith("难以确认收益。")) ||
        (boundary === "usage" && event.type === "usage")
      )
        break
    }
    const pending = boundary === "first-delta" ? stream.next() : undefined
    gateway.abort()
    assert.equal((await (pending ?? stream.next())).done, true, boundary)
  }
})

test("burst 经 ThreadStore.stop 保留已输出正文，网关结束后状态仍为 stopped", async (t) => {
  const { createMockGateway, ThreadStoreImpl } = await loadModules(t)
  const gateway = createMockGateway({ delayMs: 0 })
  const ended = Promise.withResolvers()
  const events = []
  const store = new ThreadStoreImpl("burst-stop", {
    abort: () => gateway.abort(),
    async *stream(input) {
      try {
        for await (const event of gateway.stream(input)) {
          events.push(event)
          yield event
        }
      } finally {
        ended.resolve()
      }
    },
  })
  let stopped
  store.subscribe(() => {
    const reply = store.getState().messages.at(-1)
    if (
      store.streaming &&
      reply?.parts.some((part) => part.kind === "text" && part.text)
    ) {
      store.stop()
      stopped = store.getState()
    }
  })
  assert.equal(store.send("[burst] 中途停止"), true)
  await ended.promise
  assert.ok(stopped)
  assert.equal(store.getState(), stopped)
  assert.equal(store.streaming, false)
  assert.equal(stopped.status, "idle")
  assert.equal(stopped.messages.at(-1).state, "stopped")
  const text = stopped.messages
    .at(-1)
    .parts.find((part) => part.kind === "text").text
  assert.match(text, /🔍/)
  assert.ok(!text.includes("难以确认收益。"))
  assert.equal(events.at(-1).type, "delta")
  assert.equal(
    events.filter((event) => event.type === "delta" && event.partId === 3)
      .length,
    1
  )
  assert.ok(!events.some((event) => event.type === "completed"))
})

test("模型选择贯通：metadata 反映请求模型，开场白与最终回复一致", async (t) => {
  const { createMockGateway } = await loadModules(t)
  const gateway = createMockGateway({ delayMs: 0 })
  const events = []
  for await (const event of gateway.stream({
    messages: [{ role: "user", text: "普通问题" }],
    model: "sonnet-5",
  }))
    events.push(event)

  const started = events.find((event) => event.type === "started")
  assert.equal(started.metadata.requestedModel, "sonnet-5")
  assert.equal(started.metadata.resolvedModel, "sonnet-5-2026-10")

  // partId 0/1 是推理与工具，首段正文从 2 开始。
  const seg1 = events
    .filter((event) => event.type === "delta" && event.partId === 2)
    .map((event) => event.text)
    .join("")
  assert.ok(seg1.startsWith("直接给结论："))
  assert.equal(events.at(-1).type, "completed")
  assert.ok(
    events.at(-1).response.assistant.parts.find(part => part.type === "text").text.startsWith("直接给结论：")
  )
  assert.deepEqual(events.at(-1).response.assistant.parts, events.filter(event => event.type === "part-completed").map(event => event.content))
  assert.equal(events.at(-1).response.metadata.requestedModel, "sonnet-5")
})

test("缺省模型回退 pine-1，无开场白", async (t) => {
  const { createMockGateway } = await loadModules(t)
  const events = []
  for await (const event of createMockGateway({ delayMs: 0 }).stream({
    messages: [{ role: "user", text: "普通问题" }],
  }))
    events.push(event)
  const started = events.find((event) => event.type === "started")
  assert.equal(started.metadata.requestedModel, "pine-1")
  const firstText = events.find(
    (event) => event.type === "part-completed" && event.content.type === "text"
  )
  assert.ok(firstText.content.text.startsWith("## 先定位耗时"))
})

test("未知模型名即使匹配对象原型属性也回退默认人格", async (t) => {
  const { createMockGateway } = await loadModules(t)
  for (const model of ["unknown", "constructor", "toString", "__proto__"]) {
    const gateway = createMockGateway({ delayMs: 0 })
    const stream = gateway.stream({ messages: [{ role: "user", text: "hello" }], model })
    const { value } = await stream.next()
    gateway.abort()
    await stream.return()
    assert.equal(value.metadata.requestedModel, model)
    assert.equal(value.metadata.resolvedModel, "pine-1-2026-10")
  }
})
