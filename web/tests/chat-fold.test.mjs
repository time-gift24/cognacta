import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

async function loadFold(t) {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  return server.ssrLoadModule("/src/chat/fold.ts");
}

test("完整流式回合：事件依次折叠为运行中 → 完成的视图状态", async (t) => {
  const { createThreadState, appendUserMessage, foldChatEvent } = await loadFold(t);

  let state = createThreadState("t1");
  state = appendUserMessage(state, "为什么构建这么慢？");
  assert.equal(state.status, "submitted");
  assert.equal(state.messages.at(-1).role, "user");

  const metadata = { providerName: "p", protocolName: "mock", requestedModel: "m" };
  state = foldChatEvent(state, { type: "started", metadata });
  assert.equal(state.status, "streaming");
  assert.equal(state.messages.at(-1).role, "assistant");

  state = foldChatEvent(state, { type: "part-started", partId: 0, kind: "reasoning" });
  assert.equal(state.messages.at(-1).parts[0].state, "running");
  state = foldChatEvent(state, { type: "delta", partId: 0, text: "先想" });
  state = foldChatEvent(state, { type: "delta", partId: 0, text: "一下" });
  assert.equal(state.messages.at(-1).parts[0].state, "running");
  state = foldChatEvent(state, {
    type: "part-completed",
    partId: 0,
    content: { type: "reasoning", text: "先想一下" },
  });
  assert.equal(state.messages.at(-1).parts[0].state, "done");
  assert.equal(state.messages.at(-1).state, "streaming");

  state = foldChatEvent(state, { type: "part-started", partId: 1, kind: "tool-call", name: "searchCode" });
  state = foldChatEvent(state, { type: "delta", partId: 1, text: '{"query":' });
  state = foldChatEvent(state, { type: "delta", partId: 1, text: '"x"}' });
  state = foldChatEvent(state, {
    type: "part-completed",
    partId: 1,
    content: {
      type: "tool-call",
      call: { callId: "c1", name: "searchCode", inputText: '{"query":"x"}', output: { files: ["a.ts"] } },
    },
  });

  state = foldChatEvent(state, { type: "part-started", partId: 2, kind: "text" });
  state = foldChatEvent(state, { type: "delta", partId: 2, text: "因为缓存键" });
  state = foldChatEvent(state, {
    type: "part-completed",
    partId: 2,
    content: { type: "text", text: "因为缓存键" },
  });
  state = foldChatEvent(state, { type: "usage", usage: { inputTokens: 10 } });
  state = foldChatEvent(state, {
    type: "completed",
    response: {
      assistant: { parts: [
        { type: "reasoning", text: "先想一下" },
        { type: "tool-call", call: { callId: "c1", name: "searchCode", inputText: '{"query":"x"}', output: { files: ["a.ts"] } } },
        { type: "text", text: "因为缓存键" },
      ] },
      finish: { reason: "stop" },
      usage: { inputTokens: 10, outputTokens: 20 },
      metadata,
    },
  });

  const reply = state.messages.at(-1);
  assert.equal(state.status, "idle");
  assert.equal(reply.state, "done");
  assert.deepEqual(
    reply.parts.map((part) => part.kind),
    ["reasoning", "tool", "text"],
  );
  assert.equal(reply.parts[0].text, "先想一下");
  assert.equal(reply.parts[1].state, "done");
  assert.equal(reply.parts[1].name, "searchCode");
  assert.equal(reply.parts[1].inputText, '{"query":"x"}');
  assert.equal(reply.parts[2].text, "因为缓存键");
  assert.deepEqual(reply.parts.map(part => part.id), [0, 1, 2]);
  assert.equal(state.usage.outputTokens, 20);
});

test("流中错误：保留已输出内容并标记失败", async (t) => {
  const { createThreadState, appendUserMessage, foldChatEvent } = await loadFold(t);

  let state = createThreadState("t1");
  state = appendUserMessage(state, "hi");
  state = foldChatEvent(state, { type: "started", metadata: { providerName: "p", protocolName: "x", requestedModel: "m" } });
  state = foldChatEvent(state, { type: "part-started", partId: 0, kind: "text" });
  state = foldChatEvent(state, { type: "delta", partId: 0, text: "半截回复" });
  state = foldChatEvent(state, {
    type: "failed",
    error: { kind: "transport", message: "断流" },
  });

  const reply = state.messages.at(-1);
  assert.equal(state.status, "failed");
  assert.equal(state.error.kind, "transport");
  assert.equal(reply.state, "failed");
  assert.equal(reply.parts[0].text, "半截回复");
});

test("工具步骤失败：步骤标记 error，其余部分不受影响", async (t) => {
  const { createThreadState, appendUserMessage, foldChatEvent } = await loadFold(t);

  let state = createThreadState("t1");
  state = appendUserMessage(state, "hi");
  state = foldChatEvent(state, { type: "started", metadata: { providerName: "p", protocolName: "x", requestedModel: "m" } });
  state = foldChatEvent(state, { type: "part-started", partId: 0, kind: "tool-call", name: "searchCode" });
  state = foldChatEvent(state, {
    type: "part-completed",
    partId: 0,
    content: {
      type: "tool-call",
      call: { callId: "c1", name: "searchCode", inputText: "{}", errorText: "503" },
    },
  });
  state = foldChatEvent(state, { type: "part-started", partId: 1, kind: "text" });
  state = foldChatEvent(state, { type: "delta", partId: 1, text: "仍然回答" });

  const reply = state.messages.at(-1);
  assert.equal(reply.parts[0].state, "error");
  assert.equal(reply.parts[0].errorText, "503");
  assert.equal(reply.parts[1].text, "仍然回答");
});

test("停止：进行中的回复保留已输出内容并标记 stopped", async (t) => {
  const { createThreadState, appendUserMessage, foldChatEvent, markStopped } = await loadFold(t);

  let state = createThreadState("t1");
  state = appendUserMessage(state, "hi");
  state = foldChatEvent(state, { type: "started", metadata: { providerName: "p", protocolName: "x", requestedModel: "m" } });
  state = foldChatEvent(state, { type: "part-started", partId: 0, kind: "text" });
  state = foldChatEvent(state, { type: "delta", partId: 0, text: "已输出" });
  state = markStopped(state);

  const reply = state.messages.at(-1);
  assert.equal(state.status, "idle");
  assert.equal(reply.state, "stopped");
  assert.equal(reply.parts[0].text, "已输出");
});

test("思考中停止或失败保留文本，未完成步骤不伪装成完成", async (t) => {
  const { createThreadState, foldChatEvent, markStopped } = await loadFold(t);
  let state = foldChatEvent(createThreadState("t1"), {
    type: "started",
    metadata: { providerName: "p", protocolName: "mock", requestedModel: "m" },
  });
  state = foldChatEvent(state, { type: "part-started", partId: 0, kind: "reasoning" });
  state = foldChatEvent(state, { type: "delta", partId: 0, text: "正在检查" });

  const failed = foldChatEvent(state, {
    type: "failed", error: { kind: "transport", message: "断流" },
  });
  const stopped = markStopped(state);
  assert.equal(stopped.messages[0].state, "stopped");
  assert.equal(failed.messages[0].state, "failed");
  for (const ended of [stopped, failed]) {
    assert.deepEqual(ended.messages[0].parts[0], {
      id: 0, kind: "reasoning", text: "正在检查", state: "running",
    });
  }
});

test("重新生成历史回复时，开始、增量、失败和停止都只更新目标消息", async (t) => {
  const { foldChatEvent, markStopped } = await loadFold(t);
  const metadata = { providerName: "p", protocolName: "x", requestedModel: "m" };
  const original = {
    threadId: "t1", status: "idle",
    messages: [
      { id: "m1", role: "assistant", state: "done", parts: [{ kind: "text", text: "old" }] },
      { id: "m2", role: "assistant", state: "done", parts: [{ kind: "text", text: "keep" }] },
    ],
  };
  let state = foldChatEvent(original, { type: "started", metadata }, "m1");
  assert.equal(state.messages[0].state, "streaming");
  assert.deepEqual(state.messages[0].parts, []);
  state = foldChatEvent(state, { type: "part-started", partId: 0, kind: "text" }, "m1");
  state = foldChatEvent(state, { type: "delta", partId: 0, text: "new" }, "m1");
  assert.equal(state.messages[0].parts[0].text, "new");
  assert.equal(markStopped(state, "m1").messages[0].state, "stopped");
  state = foldChatEvent(state, { type: "failed", error: { kind: "transport", message: "fail" } }, "m1");
  assert.equal(state.messages[0].state, "failed");
  assert.deepEqual(state.messages[1], original.messages[1]);
});


test("正文隔断分段：连续思考/工具聚为一组，正文把事件流切开", async (t) => {
  const { segmentAssistantParts } = await loadFold(t);

  const reasoning = (text) => ({ kind: "reasoning", text, state: "done" });
  const tool = (name) => ({
    kind: "tool", callId: name, name, inputText: "{}", state: "done",
  });
  const text = (value) => ({ kind: "text", text: value });

  const segments = segmentAssistantParts([
    reasoning("r0"), tool("readBuildLog"), text("第一段"),
    reasoning("r3"), tool("searchCode"), text("第二段"),
    reasoning("r6"), tool("searchWeb"), text("第三段"),
  ]);

  assert.deepEqual(
    segments.map((segment) => segment.kind),
    ["steps", "text", "steps", "text", "steps", "text"],
  );
  assert.equal(segments[0].parts.length, 2);
  assert.equal(segments[2].parts.length, 2);
  assert.equal(segments[4].parts.length, 2);
  assert.equal(segments[1].text, "第一段");
  assert.equal(segments[5].text, "第三段");
});

test("正文隔断分段：空白正文不切断分组，可见正文保留原始空白", async (t) => {
  const { segmentAssistantParts } = await loadFold(t);

  for (const text of ["", " ", "\n\n", " \t\r\n "]) {
    const streaming = segmentAssistantParts([
      { kind: "reasoning", text: "想", state: "done" },
      { kind: "text", text },
      { kind: "tool", callId: "c", name: "searchCode", inputText: "", state: "running" },
    ]);
    assert.equal(streaming.length, 1);
    assert.equal(streaming[0].kind, "steps");
    assert.equal(streaming[0].parts.length, 2);
  }

  const segments = segmentAssistantParts([
    { kind: "reasoning", text: "先想", state: "done" },
    { kind: "text", text: "\n  正文  \n" },
    { kind: "reasoning", text: "再想", state: "running" },
  ]);
  assert.deepEqual(
    segments.map((segment) => segment.kind),
    ["steps", "text", "steps"],
  );
  assert.equal(segments[0].parts.length, 1);
  assert.equal(segments[1].text, "\n  正文  \n");
  assert.equal(segments[2].parts.length, 1);
});
