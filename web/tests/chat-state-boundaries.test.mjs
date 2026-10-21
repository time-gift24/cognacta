import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

const metadata = { providerName: "test", protocolName: "test", requestedModel: "test" };
const completed = { type: "completed", response: {
  assistant: { parts: [{ type: "text", text: "kept" }] }, finish: { reason: "stop" }, usage: {}, metadata,
} };
const startText = [
  { type: "started", metadata },
  { type: "part-started", partId: 0, kind: "text" },
  { type: "delta", partId: 0, text: "kept" },
];

async function load(t) {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  t.after(() => server.close());
  return {
    ...await server.ssrLoadModule("/src/chat/thread-store.ts"),
    ...await server.ssrLoadModule("/src/chat/fold.ts"),
    ...await server.ssrLoadModule("/src/chat/wire.ts"),
    ...await server.ssrLoadModule("/src/chat/registry.ts"),
  };
}

async function settled(store) {
  for (let i = 0; i < 100 && store.streaming; i++) {
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  assert.equal(store.streaming, false, "request must settle");
}

test("terminal events settle once and later events or cleanup errors cannot rewrite the result", async t => {
  const { ThreadStoreImpl } = await load(t);
  for (const terminal of [completed, { type: "failed", error: { kind: "transport", message: "first failure" } }]) {
    let readPastTerminal = false;
    const store = new ThreadStoreImpl("terminal", {
      abort() {},
      async *stream() {
        try {
          yield* startText;
          yield terminal;
          readPastTerminal = true;
          yield { type: "delta", partId: 0, text: "wrong" };
        } finally {
          throw new Error("cleanup failed");
        }
      },
    });
    store.send("question");
    await settled(store);
    assert.equal(readPastTerminal, false);
    assert.equal(store.getState().messages.at(-1).parts[0].text, "kept");
    assert.equal(store.getState().status, terminal.type === "completed" ? "idle" : "failed");
    assert.equal(store.getState().error?.message, terminal.error?.message);
  }
});

test("an EOF without a terminal event is a truncated failure, not a user stop", async t => {
  const { ThreadStoreImpl } = await load(t);
  const store = new ThreadStoreImpl("eof", { abort() {}, async *stream() { yield* startText; } });
  store.send("question");
  await settled(store);
  assert.equal(store.getState().error?.kind, "truncated");
  assert.equal(store.getState().messages.at(-1).state, "failed");
  assert.equal(store.getState().messages.at(-1).parts[0].text, "kept");
});

test("a throwing abort retains task ownership and reports the failure", async t => {
  const { ThreadStoreImpl } = await load(t);
  const end = Promise.withResolvers();
  t.after(() => end.resolve());
  const store = new ThreadStoreImpl("abort", {
    abort() { throw new Error("transport already closed"); },
    async *stream() { await end.promise; yield completed; },
  });
  const states = [];
  store.subscribe(() => states.push(store.getState().status));
  store.send("old");
  assert.doesNotThrow(() => store.stop());
  assert.equal(states.at(-1), "streaming");
  assert.equal(store.getState().error.message, "transport already closed");
  assert.equal(store.send("new"), false);
  end.resolve();
  await settled(store);
});

test("subscriptions changed during notification do not run again in the same emission", async t => {
  const { ThreadStoreImpl } = await load(t);
  const end = Promise.withResolvers();
  t.after(() => end.resolve());
  const store = new ThreadStoreImpl("listeners", { abort() {}, async *stream() { await end.promise; yield completed; } });
  let calls = 0;
  let unsubscribe;
  const listener = () => {
    calls++;
    if (calls < 3) { unsubscribe(); unsubscribe = store.subscribe(listener); }
  };
  unsubscribe = store.subscribe(listener);
  store.send("question");
  assert.equal(calls, 1);
  unsubscribe();
  end.resolve();
  await settled(store);
});

test("non-contiguous part IDs keep a dense view and resolve later deltas by identity", async t => {
  const { createThreadState, foldChatEvent, segmentAssistantParts } = await load(t);
  let state = foldChatEvent(createThreadState("parts"), { type: "started", metadata });
  for (const partId of [10, 2]) {
    state = foldChatEvent(state, { type: "part-started", partId, kind: "text" });
    state = foldChatEvent(state, { type: "delta", partId, text: String(partId) });
  }
  assert.doesNotThrow(() => segmentAssistantParts(state.messages[0].parts));
  assert.deepEqual(state.messages[0].parts.map(part => part.text), ["10", "2"]);
});

test("duplicate starts and deltas for unknown parts fail without destroying accepted text", async t => {
  const { createThreadState, foldChatEvent } = await load(t);
  let state = createThreadState("invalid");
  for (const event of startText) state = foldChatEvent(state, event);
  for (const invalid of [
    { type: "started", metadata },
    { type: "part-started", partId: 0, kind: "text" },
    { type: "delta", partId: 9, text: "unknown" },
    { type: "part-completed", partId: 0, content: { type: "reasoning", text: "wrong kind" } },
  ]) {
    const rejected = foldChatEvent(state, invalid);
    assert.equal(rejected.error?.kind, "invalid-response");
    assert.equal(rejected.messages[0].parts[0].text, "kept");
  }
});

test("wire rejects impossible counters and part IDs before folding", async t => {
  const { chatEventFromWire, WireFormatError } = await load(t);
  for (const count of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => chatEventFromWire({ type: "usage", usage: { total_tokens: count } }), WireFormatError);
  }
  for (const part of [-1, 1.5, 2 ** 32]) {
    assert.throws(() => chatEventFromWire({ type: "part_started", part, kind: "text" }), WireFormatError);
  }
});

test("request attachments and exported snapshots cannot mutate the stored conversation", async t => {
  const { ThreadStoreImpl } = await load(t);
  const requests = [];
  const store = new ThreadStoreImpl("isolation", {
    abort() {},
    async *stream(request) {
      requests.push(request);
      yield completed;
    },
  });
  const attachments = [{ name: "original.txt", mediaType: "text/plain" }];
  store.send("question", attachments);
  attachments[0].name = "caller mutation";
  await settled(store);
  requests[0].messages[0].attachments[0].name = "gateway mutation";
  const snapshot = store.snapshot();
  snapshot.state.messages[0].parts[0].text = "snapshot mutation";
  snapshot.state.messages[0].attachments[0].name = "snapshot attachment mutation";
  assert.equal(store.getState().messages[0].parts[0].text, "question");
  assert.equal(store.getState().messages[0].attachments[0].name, "original.txt");
  store.retry();
  await settled(store);
  assert.equal(requests[1].messages[0].attachments[0].name, "original.txt");
});

test("completion subscribers can submit immediately and new requests clear stale usage", async t => {
  const { ThreadStoreImpl } = await load(t);
  const end = Promise.withResolvers();
  t.after(() => end.resolve());
  let accepted;
  const store = new ThreadStoreImpl("next", {
    abort() {},
    async *stream(request) {
      const first = request.messages[0].text === "first";
      try {
        if (!first) await end.promise;
        yield { ...completed, response: { ...completed.response, usage: { totalTokens: 42 } } };
      } finally {
        if (first) throw new Error("old iterator cleanup failed");
      }
    },
  });
  store.subscribe(() => {
    if (store.getState().status === "idle" && store.getState().messages.length === 2) {
      accepted = store.send("second");
    }
  });
  store.send("first");
  await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal(accepted, true);
  assert.equal(store.streaming, true, "Old iterator cleanup must not settle the new turn");
  assert.equal(store.getState().usage, undefined);
  assert.equal(store.getState().metadata, undefined);
  end.resolve();
  await settled(store);
});

test("synchronous stream errors settle as failures and retry can recover", async t => {
  const { ThreadStoreImpl } = await load(t);
  let fail = true;
  const store = new ThreadStoreImpl("throw", {
    abort() {},
    stream() {
      if (fail) throw new Error("synchronous transport failure");
      return (async function* () { yield completed; })();
    },
  });
  assert.equal(store.send("question"), true);
  await settled(store);
  assert.equal(store.getState().status, "failed");
  assert.equal(store.getState().messages.at(-1).state, "failed");
  fail = false;
  store.retry();
  await settled(store);
  assert.equal(store.getState().messages.at(-1).state, "done");
});

test("LRU order stays deterministic within one clock tick and invalid limits never evict", async t => {
  const { createThreadStoreRegistry } = await load(t);
  t.mock.method(Date, "now", () => 100);
  const registry = createThreadStoreRegistry(() => ({ abort() {}, stream() { throw new Error("unused"); } }));
  registry.acquire("old"); registry.release("old");
  registry.acquire("recent"); registry.release("recent");
  registry.acquire("old"); registry.release("old");
  for (const limit of [-1, 0.5, NaN, Infinity]) {
    assert.throws(() => registry.evictIdle(limit), RangeError);
    assert.ok(registry.snapshot("old") && registry.snapshot("recent"));
  }
  registry.evictIdle(1);
  assert.ok(registry.snapshot("old"));
  assert.equal(registry.snapshot("recent"), undefined);
});

test("a final-only response publishes all assistant content without requiring deltas", async t => {
  const { ThreadStoreImpl } = await load(t);
  const store = new ThreadStoreImpl("final-only", {
    abort() {},
    async *stream() {
      yield { type: "started", metadata };
      yield { ...completed, response: { ...completed.response, assistant: { parts: [
        { type: "reasoning", text: "finished thinking" },
        { type: "tool-call", call: { callId: "call", name: "search", inputText: "{}", output: { found: true } } },
        { type: "text", text: "Final authoritative answer" },
      ] } } };
    },
  });
  store.send("question");
  await settled(store);
  const reply = store.getState().messages.at(-1);
  assert.equal(reply.state, "done");
  assert.deepEqual(reply.parts.map(part => part.kind), ["reasoning", "tool", "text"]);
  assert.equal(reply.parts[2].text, "Final authoritative answer");
  assert.equal(reply.parts[0].state, "done");
  assert.equal(reply.parts[1].state, "done");
  assert.deepEqual(reply.parts[1].output, { found: true });
});

test("the final snapshot corrects partial content, preserves part identities and adds final-only content", async t => {
  const { createThreadState, foldChatEvent } = await load(t);
  let state = foldChatEvent(createThreadState("final-correction"), { type: "started", metadata });
  for (const [partId, kind] of [[11, "reasoning"], [4, "tool-call"], [99, "text"], [12, "reasoning"], [5, "tool-call"], [100, "text"]]) {
    state = foldChatEvent(state, { type: "part-started", partId, kind, name: "search" });
    state = foldChatEvent(state, { type: "delta", partId, text: "partial" });
  }
  const finalized = foldChatEvent(state, { ...completed, response: { ...completed.response, assistant: { parts: [
    { type: "reasoning", text: "complete reasoning" },
    { type: "tool-call", call: { callId: "call", name: "search", inputText: "{}", errorText: "no result" } },
    { type: "text", text: "corrected final text" },
    { type: "reasoning", text: "second reasoning" },
    { type: "tool-call", call: { callId: "second-call", name: "search", inputText: "{}", output: "found" } },
    { type: "text", text: "second final text" },
    { type: "text", text: "only delivered on completion" },
  ] } } });
  const parts = finalized.messages[0].parts;
  assert.deepEqual(parts.map(part => part.id), [11, 4, 99, 12, 5, 100, undefined]);
  assert.deepEqual(parts.map(part => part.kind), ["reasoning", "tool", "text", "reasoning", "tool", "text", "text"]);
  assert.deepEqual(parts.filter(part => part.kind === "text").map(part => part.text), ["corrected final text", "second final text", "only delivered on completion"]);
  assert.equal(parts[0].state, "done");
  assert.equal(parts[1].state, "error");
  assert.equal(parts[1].errorText, "no result");
  assert.equal(parts[4].state, "done");
  assert.equal(state.messages[0].parts[2].text, "partial", "Earlier state snapshots stay immutable");
  const empty = foldChatEvent(state, { ...completed, response: { ...completed.response, assistant: { parts: [] } } });
  assert.deepEqual(empty.messages[0].parts, [], "An explicitly empty authoritative snapshot must not retain stale partial content");
  const emptyText = foldChatEvent(state, { ...completed, response: { ...completed.response, assistant: { parts: [{ type: "text", text: "" }] } } });
  assert.deepEqual(emptyText.messages[0].parts, [{ id: 99, kind: "text", text: "", complete: true }]);
});

test("final tool identity takes precedence over an earlier unfinished tool", async t => {
  const { createThreadState, foldChatEvent } = await load(t);
  for (const callId of ["known-call", "4"]) {
    let state = foldChatEvent(createThreadState("tool-identity"), { type: "started", metadata });
    state = foldChatEvent(state, { type: "part-started", partId: 4, kind: "tool-call", name: "discarded" });
    const content = { type: "tool-call", call: { callId, name: "kept", inputText: "{}", output: "result" } };
    state = foldChatEvent(state, { type: "part-started", partId: 5, kind: "tool-call", name: "kept" });
    state = foldChatEvent(state, { type: "part-completed", partId: 5, content });
    state = foldChatEvent(state, { ...completed, response: { ...completed.response, assistant: { parts: [content] } } });
    assert.deepEqual(state.messages[0].parts.map(part => [part.id, part.callId]), [[5, callId]]);
  }
});
