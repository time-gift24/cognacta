import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

async function loadWire(t) {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  return server.ssrLoadModule("/src/chat/wire.ts");
}

const metadata = {
  provider_name: "openai",
  protocol_name: "openai.responses",
  requested_model: "pine-chat-latest",
  resolved_model: "pine-chat-2026-10",
  request_id: "req_1",
  response_id: "resp_1",
};

test("完整事件流：六种事件全部正确映射为 ChatEvent", async (t) => {
  const { chatEventFromWire } = await loadWire(t);

  assert.deepEqual(chatEventFromWire({ type: "started", metadata }), {
    type: "started",
    metadata: {
      providerName: "openai",
      protocolName: "openai.responses",
      requestedModel: "pine-chat-latest",
      resolvedModel: "pine-chat-2026-10",
      requestId: "req_1",
      responseId: "resp_1",
    },
  });

  assert.deepEqual(
    chatEventFromWire({ type: "part_started", part: 0, kind: "text" }),
    { type: "part-started", partId: 0, kind: "text", name: undefined },
  );
  assert.deepEqual(
    chatEventFromWire({ type: "part_started", part: 1, kind: "tool_call", name: "searchCode" }),
    { type: "part-started", partId: 1, kind: "tool-call", name: "searchCode" },
  );

  assert.deepEqual(
    chatEventFromWire({ type: "delta", part: 0, delta: { type: "text", text: "你好" } }),
    { type: "delta", partId: 0, text: "你好" },
  );

  assert.deepEqual(
    chatEventFromWire({
      type: "part_completed",
      part: 0,
      content: { type: "text", text: "完整回复" },
    }),
    {
      type: "part-completed",
      partId: 0,
      content: { type: "text", text: "完整回复" },
    },
  );

  assert.deepEqual(
    chatEventFromWire({
      type: "usage",
      usage: { input_tokens: 10, reasoning_tokens: 3 },
    }),
    {
      type: "usage",
      usage: {
        inputTokens: 10,
        outputTokens: undefined,
        totalTokens: undefined,
        reasoningTokens: 3,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
    },
  );

  assert.deepEqual(
    chatEventFromWire({
      type: "completed",
      response: {
        assistant: { parts: [{ type: "text", text: "完整回复" }] },
        finish: { reason: "stop" },
        usage: { total_tokens: 42 },
        metadata,
      },
    }),
    {
      type: "completed",
      response: {
        assistant: { parts: [{ type: "text", text: "完整回复" }] },
        finish: { reason: "stop", providerReason: undefined },
        usage: {
          inputTokens: undefined,
          outputTokens: undefined,
          totalTokens: 42,
          reasoningTokens: undefined,
          cacheReadTokens: undefined,
          cacheWriteTokens: undefined,
        },
        metadata: {
          providerName: "openai",
          protocolName: "openai.responses",
          requestedModel: "pine-chat-latest",
          resolvedModel: "pine-chat-2026-10",
          requestId: "req_1",
          responseId: "resp_1",
        },
      },
    },
  );
});

test("failed 事件：ErrorKind 全量映射，未识别 kind 降级为 unknown", async (t) => {
  const { chatEventFromWire } = await loadWire(t);

  for (const kind of [
    "invalid-request",
    "unsupported",
    "authentication",
    "rate-limited",
    "unavailable",
    "transport",
    "timeout",
    "invalid-response",
    "truncated",
    "replay-mismatch",
    "aborted",
  ]) {
    const event = chatEventFromWire({ type: "failed", error: { kind, message: "m" } });
    assert.equal(event.error.kind, kind, `kind ${kind} 应原样保留`);
  }

  const degraded = chatEventFromWire({
    type: "failed",
    error: { kind: "some-future-kind", message: "新错误" },
  });
  assert.equal(degraded.error.kind, "unknown");
  assert.equal(degraded.error.message, "新错误");
});

test("前瞻扩展位：reasoning 与 tool_call 内容的转换", async (t) => {
  const { chatEventFromWire } = await loadWire(t);

  assert.deepEqual(
    chatEventFromWire({
      type: "part_completed",
      part: 0,
      content: { type: "reasoning", text: "推理过程" },
    }),
    { type: "part-completed", partId: 0, content: { type: "reasoning", text: "推理过程" } },
  );

  assert.deepEqual(
    chatEventFromWire({
      type: "part_completed",
      part: 1,
      content: {
        type: "tool_call",
        call_id: "call_1",
        name: "searchCode",
        input_text: '{"query":"x"}',
        output: { files: ["a.ts"] },
      },
    }),
    {
      type: "part-completed",
      partId: 1,
      content: {
        type: "tool-call",
        call: {
          callId: "call_1",
          name: "searchCode",
          inputText: '{"query":"x"}',
          output: { files: ["a.ts"] },
          errorText: undefined,
        },
      },
    },
  );
});

test("畸形载荷：抛出 WireFormatError 并指明字段", async (t) => {
  const { chatEventFromWire, WireFormatError } = await loadWire(t);

  for (const bad of [
    null,
    "text",
    { type: "started" },
    { type: "started", metadata: { provider_name: 1 } },
    { type: "part_started", part: -1, kind: "text" },
    { type: "part_started", part: 0, kind: "hologram" },
    { type: "delta", part: 0, delta: { type: "image" } },
    { type: "completed", response: { assistant: { parts: "x" } } },
    { type: "completed", response: { assistant: { parts: [] }, finish: { reason: "weird" }, usage: {}, metadata } },
    { type: "mystery" },
  ]) {
    assert.throws(() => chatEventFromWire(bad), WireFormatError, JSON.stringify(bad));
  }

  assert.throws(
    () => chatEventFromWire({ type: "delta", part: 0, delta: { type: "text", text: 1 } }),
    /delta\.text/,
  );
});

test("请求方向：ChatRequest 序列化为线格式", async (t) => {
  const { chatRequestToWire } = await loadWire(t);

  assert.deepEqual(
    chatRequestToWire({
      messages: [
        { role: "user", text: "第一条" },
        { role: "user", text: "第二条", attachments: [{ name: "a.png", mediaType: "image/png" }] },
      ],
      instructions: "Be concise",
    }),
    {
      messages: [
        { role: "user", text: "第一条" },
        { role: "user", text: "第二条" },
      ],
      instructions: "Be concise",
    },
  );
});

test("帧流适配：NDJSON 行 → ChatEvent 流，终止事件后停止", async (t) => {
  const { chatEventsFromFrames } = await loadWire(t);

  async function* frames() {
    yield JSON.stringify({ type: "started", metadata });
    yield "";
    yield JSON.stringify({ type: "delta", part: 0, delta: { type: "text", text: "嗨" } });
    yield JSON.stringify({
      type: "completed",
      response: {
        assistant: { parts: [] },
        finish: { reason: "stop" },
        usage: {},
        metadata,
      },
    });
    yield JSON.stringify({ type: "delta", part: 0, delta: { type: "text", text: "多余" } });
  }

  const events = [];
  for await (const event of chatEventsFromFrames(frames())) events.push(event);
  assert.deepEqual(
    events.map((event) => event.type),
    ["started", "delta", "completed"],
  );
});

test("帧流适配：JSON 解析失败与格式错误都转为 failed 事件收尾", async (t) => {
  const { chatEventsFromFrames } = await loadWire(t);

  async function* badJson() {
    yield "{not json";
    yield JSON.stringify({ type: "delta", part: 0, delta: { type: "text", text: "不该出现" } });
  }
  const fromBadJson = [];
  for await (const event of chatEventsFromFrames(badJson())) fromBadJson.push(event);
  assert.equal(fromBadJson.length, 1);
  assert.equal(fromBadJson[0].type, "failed");
  assert.equal(fromBadJson[0].error.kind, "invalid-response");

  async function* badShape() {
    yield JSON.stringify({ type: "mystery" });
  }
  const fromBadShape = [];
  for await (const event of chatEventsFromFrames(badShape())) fromBadShape.push(event);
  assert.equal(fromBadShape.length, 1);
  assert.equal(fromBadShape[0].type, "failed");
  assert.equal(fromBadShape[0].error.kind, "invalid-response");
  assert.match(fromBadShape[0].error.message, /未知的事件 type/);
});
