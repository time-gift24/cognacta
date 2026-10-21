import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

async function loadModules(t) {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { ThreadStoreImpl } = await server.ssrLoadModule("/src/chat/thread-store.ts");
  const { createThreadStoreRegistry } = await server.ssrLoadModule("/src/chat/registry.ts");
  const { createMockGateway } = await server.ssrLoadModule("/src/adapters/demo/chat.ts");
  return { ThreadStoreImpl, createThreadStoreRegistry, createMockGateway };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function waitFor(check, timeoutMs = 3000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timeout");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("send → 流式完成：状态回到 idle，回复完整", async (t) => {
  const { ThreadStoreImpl, createMockGateway } = await loadModules(t);
  const store = new ThreadStoreImpl("t1", createMockGateway({ delayMs: 1 }));

  store.send("为什么构建这么慢？");
  assert.equal(store.getState().status, "submitted");
  await waitFor(() => store.getState().status === "idle" && !store.streaming);

  const reply = store.getState().messages.at(-1);
  assert.equal(reply.role, "assistant");
  assert.equal(reply.state, "done");
  assert.ok(reply.parts.some((part) => part.kind === "tool"));
  assert.ok(reply.parts.at(-1).text.includes("缓存键"));
});

test("卸载后流继续折叠，重挂载（再次订阅）即见最新状态", async (t) => {
  const { ThreadStoreImpl, createMockGateway } = await loadModules(t);
  const store = new ThreadStoreImpl("t1", createMockGateway({ delayMs: 1 }));

  const seen = [];
  const unsubscribe = store.subscribe(() => seen.push(store.getState()));
  store.send("[slow] 慢一点");
  unsubscribe();
  assert.equal(store.listenerCount, 0);

  await waitFor(() => store.getState().status === "idle", 15000);
  const eventsDuringUnmounted = seen.length;
  const reply = store.getState().messages.at(-1);
  assert.equal(reply.state, "done");
  assert.ok(eventsDuringUnmounted > 0);

  let latest = null;
  store.subscribe(() => { latest = store.getState(); });
  latest = store.getState();
  assert.equal(latest.messages.at(-1).state, "done");
});

test("stop 保留已输出内容；流式中的线程不被驱逐", async (t) => {
  const { createThreadStoreRegistry, createMockGateway } = await loadModules(t);
  const registry = createThreadStoreRegistry(() => createMockGateway({ delayMs: 1 }));
  const store = registry.acquire("t1");
  t.after(() => store.stop());

  store.send("[slow] 长回复");
  await waitFor(() => store.getState().messages.at(-1)?.role === "assistant" &&
    store.getState().messages.at(-1).parts.some((p) => p.kind === "text" && p.text.length > 0));

  registry.release("t1");
  registry.evictIdle();
  assert.ok(registry.snapshot("t1"), "streaming store must survive eviction");

  store.stop();
  const reply = store.getState().messages.at(-1);
  assert.equal(reply.state, "stopped");
  assert.ok(reply.parts.some((p) => p.kind === "text" && p.text.length > 0));

  registry.evictIdle();
  assert.equal(registry.snapshot("t1"), undefined);
});

test("发送失败：状态 failed 且 retry 重发同一输入", async (t) => {
  const { createThreadStoreRegistry, createMockGateway } = await loadModules(t);
  const registry = createThreadStoreRegistry(() => createMockGateway({ delayMs: 1 }));
  const store = registry.acquire("t1");

  store.send("[fail-send] 会失败");
  await waitFor(() => store.getState().status === "failed");
  assert.equal(store.getState().error.kind, "transport");

  store.retry();
  await waitFor(() => store.getState().status === "failed");
  // Mock 对同一文本仍然返回失败。
  assert.equal(store.getState().messages.filter((m) => m.role === "user").length, 1);
  await flush();
});

test("snapshot 可 JSON 序列化", async (t) => {
  const { ThreadStoreImpl, createMockGateway } = await loadModules(t);
  const store = new ThreadStoreImpl("t1", createMockGateway({ delayMs: 1 }));
  store.send("hi");
  await waitFor(() => store.getState().status === "idle");
  const snapshot = store.snapshot();
  assert.equal(snapshot.version, 1);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

const metadata = { providerName: "test", protocolName: "test", requestedModel: "test" };
const completed = {
  type: "completed",
  response: { assistant: { parts: [] }, finish: { reason: "stop" }, usage: {}, metadata },
};

test("stop 后旧流的事件、异常和收尾不能改写新回合", async (t) => {
  const { ThreadStoreImpl } = await loadModules(t);
  for (const late of ["event", "error", "eof"]) {
    const oldEnd = Promise.withResolvers();
    const newEnd = Promise.withResolvers();
    t.after(() => { oldEnd.resolve(); newEnd.resolve(); });
    const gateway = {
      abort() {},
      async *stream(request) {
        const text = request.messages[0].text;
        yield { type: "started", metadata };
        yield { type: "part-started", partId: 0, kind: "text" };
        yield { type: "delta", partId: 0, text };
        if (text === "old") {
          await oldEnd.promise;
          if (late === "error") throw new Error("late error");
          if (late === "event") yield { type: "delta", partId: 0, text: "stale" };
          return;
        }
        await newEnd.promise;
        yield completed;
      },
    };
    const store = new ThreadStoreImpl(late, gateway);
    store.send("old");
    await waitFor(() => store.getState().messages.at(-1)?.parts[0]?.text === "old");
    store.stop();
    store.send("new");
    await waitFor(() => store.getState().messages.at(-1)?.parts[0]?.text === "new");
    oldEnd.resolve();
    await flush();
    assert.equal(store.streaming, true, late);
    assert.equal(store.getState().status, "streaming", late);
    assert.equal(store.getState().messages.at(-1).state, "streaming", late);
    assert.equal(store.getState().messages.at(-1).parts[0].text, "new", late);
    newEnd.resolve();
    await waitFor(() => !store.streaming);
  }
});

test("async stop retains ownership until acknowledgement and ignores late stream events", async (t) => {
  const { ThreadStoreImpl } = await loadModules(t);
  const acknowledgement = Promise.withResolvers();
  const oldEnd = Promise.withResolvers();
  const newEnd = Promise.withResolvers();
  let stops = 0;
  t.after(() => { acknowledgement.resolve(); oldEnd.resolve(); newEnd.resolve(); });
  const store = new ThreadStoreImpl("async-stop", {
    abort() { stops += 1; return acknowledgement.promise; },
    async *stream(input) {
      const text = input.messages[0].text;
      yield { type: "started", metadata };
      yield { type: "part-started", partId: 0, kind: "text" };
      yield { type: "delta", partId: 0, text };
      await (text === "old" ? oldEnd.promise : newEnd.promise);
      yield { type: "delta", partId: 0, text: "late" };
      yield completed;
    },
  });
  store.send("old");
  await waitFor(() => store.getState().messages.at(-1)?.parts[0]?.text === "old");
  store.stop();
  store.stop();
  assert.equal(stops, 1);
  assert.equal(store.streaming, true);
  assert.equal(store.getState().status, "stopping");
  assert.equal(store.send("too early"), false);
  acknowledgement.resolve();
  await waitFor(() => !store.streaming);
  assert.equal(store.getState().messages.at(-1).state, "stopped");
  assert.equal(store.send("new"), true);
  await waitFor(() => store.getState().messages.at(-1)?.parts[0]?.text === "new");
  oldEnd.resolve();
  await flush();
  assert.equal(store.streaming, true);
  assert.equal(store.getState().messages.at(-1).parts[0].text, "new");
  newEnd.resolve();
  await waitFor(() => !store.streaming);
});

test("a rejected stop retains the task and exposes its error for retry", async (t) => {
  const { ThreadStoreImpl } = await loadModules(t);
  const end = Promise.withResolvers();
  let attempts = 0;
  t.after(() => end.resolve());
  const store = new ThreadStoreImpl("stop-failure", {
    abort() { return ++attempts === 1 ? Promise.reject(new Error("stop failed")) : Promise.resolve(); },
    async *stream() { yield { type: "started", metadata }; await end.promise; },
  });
  store.send("hello");
  await waitFor(() => store.getState().status === "streaming");
  store.stop();
  await waitFor(() => store.getState().error?.message === "stop failed");
  assert.equal(store.streaming, true);
  assert.equal(store.send("new"), false);
  store.stop();
  await waitFor(() => !store.streaming);
  assert.equal(store.getState().messages.at(-1).state, "stopped");
});

test("重试历史回复只更新目标，保留其他回合、ID 与原始附件", async (t) => {
  const { ThreadStoreImpl } = await loadModules(t);
  const requests = [];
  const retryEnd = Promise.withResolvers();
  t.after(() => retryEnd.resolve());
  const store = new ThreadStoreImpl("retry", {
    abort() {},
    async *stream(request) {
      requests.push(request);
      yield { type: "started", metadata };
      yield { type: "part-started", partId: 0, kind: "text" };
      yield { type: "delta", partId: 0, text: `attempt ${requests.length}` };
      if (requests.length < 3) {
        yield { type: "failed", error: { kind: "transport", message: "failed" } };
      } else {
        await retryEnd.promise;
        yield completed;
      }
    },
  });
  const attachments = [{ name: "first.txt", mediaType: "text/plain" }];
  store.send("first", attachments);
  await waitFor(() => !store.streaming);
  store.send("second");
  await waitFor(() => !store.streaming);
  const before = store.getState().messages;
  store.retry(before[1].id);
  await waitFor(() => requests.length === 3);
  assert.deepEqual(requests[2], requests[0]);
  assert.deepEqual(store.getState().messages.map((m) => m.id), before.map((m) => m.id));
  assert.deepEqual(store.getState().messages.slice(2), before.slice(2));
  assert.equal(store.getState().messages[1].state, "streaming");
  await waitFor(() => store.getState().messages[1].parts[0]?.text === "attempt 3");
  assert.equal(store.getState().messages[1].parts[0].text, "attempt 3");
  retryEnd.resolve();
  await waitFor(() => !store.streaming);
  assert.equal(store.getState().messages[1].state, "done");
  assert.deepEqual(store.getState().messages.slice(2), before.slice(2));
});

test("重试最新失败回合不删除之前的失败消息或生成重复 ID", async (t) => {
  const { ThreadStoreImpl, createMockGateway } = await loadModules(t);
  const store = new ThreadStoreImpl("failures", createMockGateway({ delayMs: 1 }));
  store.send("[fail-send] first");
  await waitFor(() => !store.streaming);
  store.send("[fail-send] second");
  await waitFor(() => !store.streaming);
  const before = store.getState().messages;
  store.retry();
  await waitFor(() => !store.streaming);
  assert.deepEqual(store.getState().messages.map((m) => m.id), before.map((m) => m.id));
  assert.deepEqual(store.getState().messages.slice(0, 3), before.slice(0, 3));
});

test("历史重试沿用目标回合的模型，包括未指定模型的缺省选择", async (t) => {
  const { ThreadStoreImpl } = await loadModules(t);
  for (const models of [["pine-1", "sonnet-5"], [undefined, "sonnet-5"], ["gpt-5.6", undefined]]) {
    const requests = [];
    const store = new ThreadStoreImpl("models", {
      abort() {},
      async *stream(request) {
        requests.push(request);
        yield { type: "started", metadata };
        yield completed;
      },
    });
    store.send("first", undefined, models[0]);
    await waitFor(() => !store.streaming);
    store.send("second", undefined, models[1]);
    await waitFor(() => !store.streaming);

    const messages = store.getState().messages;
    for (const [index, reply] of [[0, messages[1]], [1, messages[3]], [0, messages[1]]]) {
      store.retry(reply.id);
      await waitFor(() => !store.streaming);
      assert.deepEqual(requests.at(-1), requests[index]);
      assert.equal(Object.hasOwn(requests.at(-1), "model"), models[index] !== undefined);
    }
  }
});

test("已完成与已停止回复重新生成时重置状态，停止或失败更新同一消息", async (t) => {
  const { ThreadStoreImpl } = await loadModules(t);
  let attempts = 0;
  const pending = [];
  t.after(() => pending.forEach((end) => end.resolve()));
  const store = new ThreadStoreImpl("regenerate", {
    abort() {},
    async *stream() {
      const attempt = ++attempts;
      yield { type: "started", metadata };
      if (attempt > 1) {
        const end = Promise.withResolvers();
        pending.push(end);
        await end.promise;
      }
      if (attempt === 3) throw new Error("regeneration failed");
      yield { type: "part-started", partId: 0, kind: "text" };
      yield { type: "delta", partId: 0, text: "answer" };
      yield completed;
    },
  });
  store.send("question");
  await waitFor(() => !store.streaming);
  const id = store.getState().messages.at(-1).id;
  store.retry();
  await waitFor(() => pending.length === 1);
  assert.equal(store.getState().messages.at(-1).state, "streaming");
  assert.deepEqual(store.getState().messages.at(-1).parts, []);
  store.stop();
  assert.equal(store.getState().messages.at(-1).state, "stopped");
  store.retry();
  await waitFor(() => pending.length === 2);
  assert.equal(store.getState().messages.at(-1).state, "streaming");
  pending[1].resolve();
  await waitFor(() => !store.streaming);
  assert.equal(store.getState().messages.at(-1).state, "failed");
  assert.equal(store.getState().messages.at(-1).id, id);
});

test("send 只在接收非空且非忙碌的输入时返回 true", async (t) => {
  const { ThreadStoreImpl } = await loadModules(t);
  const end = Promise.withResolvers();
  t.after(() => end.resolve());
  const store = new ThreadStoreImpl("send", {
    abort() {},
    async *stream() { await end.promise; yield completed; },
  });
  assert.equal(store.send(" \n "), false);
  assert.equal(store.send("accepted"), true);
  assert.equal(store.send("busy"), false);
  assert.equal(store.getState().messages.filter((m) => m.role === "user").length, 1);
  end.resolve();
  await waitFor(() => !store.streaming);
});

test("会话切换保留独立草稿、模型与附件，直接发送不改变草稿", async (t) => {
  const { createThreadStoreRegistry } = await loadModules(t);
  const end = Promise.withResolvers();
  t.after(() => end.resolve());
  let aborted = 0;
  const registry = createThreadStoreRegistry(() => ({
    abort() { aborted += 1; },
    async *stream() { await end.promise; yield completed; },
  }));
  const first = registry.acquire("first");
  const file = new File(["draft"], "notes.txt", { type: "text/plain" });
  const attachment = { id: "file", name: file.name, type: file.type, file };
  let stateNotifications = 0;
  let draftNotifications = 0;
  const unsubscribeState = first.subscribe(() => { stateNotifications += 1; });
  const unsubscribeDraft = first.subscribeDraft(() => { draftNotifications += 1; });
  first.updateDraft({ text: "unsent", model: "sonnet-5", attachments: [attachment] });
  const originalDraft = first.getDraft();
  assert.equal(stateNotifications, 0, "typing must not notify the message view");
  assert.equal(draftNotifications, 1);
  assert.equal(first.send(" \n "), false);
  assert.equal(first.getDraft(), originalDraft);
  unsubscribeState();
  unsubscribeDraft();
  registry.release("first");

  const second = registry.acquire("second");
  second.updateDraft({ text: "other draft", model: "pine-1" });
  const secondDraft = second.getDraft();
  registry.release("second");
  assert.equal(registry.acquire("first"), first);
  assert.equal(first.getDraft(), originalDraft);
  assert.equal(first.getDraft().attachments[0].file, file);
  assert.equal(first.send("suggested prompt", undefined, "sonnet-5"), true);
  assert.equal(first.getDraft(), originalDraft);
  assert.equal(second.getDraft(), secondDraft);

  first.updateDraft({ text: "next message", attachments: [attachment] });
  const pendingDraft = first.getDraft();
  assert.equal(first.send("next message"), false);
  assert.equal(first.getDraft(), pendingDraft);
  registry.release("first");
  assert.equal(aborted, 0);
  end.resolve();
  await waitFor(() => !first.streaming);
  assert.equal(registry.acquire("first").getDraft(), pendingDraft);
  assert.equal(first.getDraft().model, "sonnet-5");
  assert.equal(first.getDraft().attachments[0].file, file);
  assert.equal(first.send(pendingDraft.text, [{ name: file.name, mediaType: file.type }], pendingDraft.model), true);
  await waitFor(() => !first.streaming);
  assert.equal(first.getDraft(), pendingDraft);
  assert.equal(second.getDraft(), secondDraft);
  registry.release("first");
});

test("失败、停止和重试不清空正在编辑的下一条草稿", async (t) => {
  const { ThreadStoreImpl } = await loadModules(t);
  const end = Promise.withResolvers();
  t.after(() => end.resolve());
  let attempts = 0;
  const store = new ThreadStoreImpl("draft-lifecycle", {
    abort() {},
    async *stream() {
      const attempt = ++attempts;
      yield { type: "started", metadata };
      if (attempt === 1) {
        yield { type: "failed", error: { kind: "transport", message: "failed" } };
        return;
      }
      await end.promise;
      yield completed;
    },
  });
  assert.equal(store.send("first message"), true);
  store.updateDraft({ text: "next draft", model: "sonnet-5" });
  const draft = store.getDraft();
  let notifications = 0;
  const unsubscribe = store.subscribeDraft(() => { notifications += 1; });
  t.after(unsubscribe);
  await waitFor(() => !store.streaming);
  assert.equal(store.getState().status, "failed");
  assert.equal(store.getDraft(), draft);
  store.retry();
  await waitFor(() => attempts === 2);
  assert.equal(store.getDraft(), draft);
  store.stop();
  assert.equal(store.getState().messages.at(-1).state, "stopped");
  assert.equal(store.getDraft(), draft);
  store.retry();
  await waitFor(() => attempts === 3);
  end.resolve();
  await waitFor(() => !store.streaming);
  assert.equal(store.getState().messages.at(-1).state, "done");
  assert.equal(store.getDraft(), draft);
  assert.equal(notifications, 0);
});

test("mock 新请求不会复活已经中止的旧请求", async (t) => {
  const { createMockGateway } = await loadModules(t);
  for (const text of ["normal", "[fail-send]"]) {
    const gateway = createMockGateway({ delayMs: 1 });
    const old = gateway.stream({ messages: [{ role: "user", text }] });
    assert.equal((await old.next()).value.type, "started");
    const pending = old.next();
    gateway.abort();
    const next = gateway.stream({ messages: [{ role: "user", text: "next" }] });
    assert.equal((await next.next()).value.type, "started");
    assert.equal((await pending).done, true);
    gateway.abort();
    await next.return();
  }
});
