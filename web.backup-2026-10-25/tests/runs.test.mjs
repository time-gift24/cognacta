import assert from "node:assert/strict"
import { test } from "node:test"
import { createServer } from "vite"
import { fileURLToPath } from "node:url"
async function modules(t) {
  const server = await createServer({ configFile: false, resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } }, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
  t.after(() => server.close())
  return { ...await server.ssrLoadModule("/src/runs/replay.ts"), ...await server.ssrLoadModule("/src/chat/thread-store.ts"), ...await server.ssrLoadModule("/src/adapters/tauri/runs.ts") }
}
const metadata = { providerName: "test", protocolName: "langgraph", requestedModel: "test" }
const response = text => ({ assistant: { parts: [{ type: "text", text }] }, metadata, usage: {}, finish: { reason: "stop" } })
const record = (overrides = {}) => ({ runId: "r1", threadId: "t", title: "first", status: "completed", startedAt: "2026-10-19T00:00:00Z", inputMessages: [{ role: "user", text: "first", attachments: [{ name: "notes.txt", mediaType: "text/plain" }] }], result: response("answer"), ...overrides })

test("history replay restores ordered messages and complete result despite rolled-over events, without execution", async t => {
  const { replayRuns, ThreadStoreImpl } = await modules(t)
  let requests = []
  const gateway = { async *stream(input) { requests.push(input); yield { type: "started", metadata }; yield { type: "completed", response: response("continued") } }, abort() {} }
  const store = new ThreadStoreImpl("t", gateway)
  store.updateDraft({ text: "keep unsent" })
  const snapshot = replayRuns("t", [record({ runId: "r2", startedAt: "2026-10-19T00:01:00Z", inputMessages: [{ role: "user", text: "next" }], result: response("second") }), record({ events: [{ type: "delta", partId: 2, text: "tail" }] })])
  assert.equal(store.restore(snapshot), true)
  assert.equal(requests.length, 0)
  assert.deepEqual(store.getState().messages.map(message => message.parts.at(-1).text), ["first", "answer", "next", "second"])
  assert.equal(store.getState().messages[0].attachments[0].name, "notes.txt")
  assert.equal(store.getDraft().text, "keep unsent")
  assert.equal(store.restore(snapshot), false, "a later history response cannot overwrite in-memory work")
  assert.throws(() => store.restore({ ...snapshot, state: { ...snapshot.state, threadId: "other" } }), /身份/)
  assert.equal(store.send("continue"), true)
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(requests.length, 1)
  assert.deepEqual(requests[0].history.map(message => message.text), ["first", "answer", "next", "second"])
  assert.equal(store.getState().messages.at(-1).parts[0].text, "continued")
})

test("cancelled and interrupted runs preserve partial output without a streaming spinner or implicit restart", async t => {
  const { replayRuns } = await modules(t)
  const events = [{ type: "started", metadata }, { type: "part-started", partId: 0, kind: "text" }, { type: "delta", partId: 0, text: "partial" }]
  for (const status of ["cancelled", "interrupted", "timed-out"]) {
    const extra = status === "cancelled" ? [{ type: "failed", error: { kind: "aborted", message: "stopped" } }] : []
    const snapshot = replayRuns("t", [record({ result: undefined, status, events: [...events, ...extra] })])
    assert.equal(snapshot.state.messages.at(-1).parts[0].text, "partial")
    assert.equal(snapshot.state.messages.at(-1).state, status === "cancelled" ? "stopped" : "failed")
    assert.notEqual(snapshot.state.status, "streaming")
    if (status === "timed-out") assert.equal(snapshot.state.error.kind, "timeout")
  }
})

test("run source validates persisted records and fixes session bindings without extra reads or execution", async t => {
  const { createRunSource, readRun } = await modules(t)
  const calls = []
  const source = createRunSource(async (method, params) => { calls.push([method, params]); return method === "runs_list" ? [record()] : method === "run_get" ? record() : null })
  source.runs.bindSession("new", { agentId: "agent", experimentSkillId: "draft" })
  assert.deepEqual(source.contextFor("new"), { agentId: "agent", experimentSkillId: "draft" })
  assert.throws(() => source.runs.bindSession("new", { agentId: "other" }), /新建会话/)
  assert.equal(calls.length, 0)
  assert.equal((await source.runs.list())[0].status, "completed")
  assert.equal((await source.runs.get("r1")).inputMessages[0].text, "first")
  assert.equal(await source.runs.snapshot("new"), null)
  assert.deepEqual(calls.map(([method]) => method), ["runs_list", "run_get", "session_snapshot"])
  assert.throws(() => readRun(record({ status: "unknown-status" })))
})
