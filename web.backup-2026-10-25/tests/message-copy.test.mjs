import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

test("复制助手正文保留独立 Markdown 段落边界，用户原文不变", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { messageText } = await server.ssrLoadModule("/src/components/chat/message-view.tsx");
  const parts = [
    { kind: "text", text: "先检查缓存。" },
    { kind: "reasoning", text: "内部步骤", state: "done" },
    { kind: "text", text: "## 检查结果\n\n```ts\nconst hit = true;\n```" },
    { kind: "text", text: "代码之后的段落。" },
  ];
  assert.equal(messageText({ role: "assistant", parts }), "先检查缓存。\n\n## 检查结果\n\n```ts\nconst hit = true;\n```\n\n代码之后的段落。");
  assert.equal(messageText({ role: "user", parts: [{ kind: "text", text: "原文\n" }, { kind: "text", text: "下一行" }] }), "原文\n下一行");
});
