import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString as renderHTML } from "react-dom/server";
import { createServer } from "vite";

test("流式正文渐显，历史正文直接呈现，代码不参与逐字动画", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const dependencies = createTestDependencies();
  const renderToString = element => renderHTML(withDependencies(element, dependencies));
  const { Markdown } = await server.ssrLoadModule("/src/components/chat/markdown.tsx");
  const children = "你好 🚀 **世界**。\n\n```ts\nconst answer = 42;\n```";

  for (const streaming of [true, false]) {
    const html = renderToString(createElement(Markdown, { children, streaming }));
    assert.equal(html.includes("data-sd-animate="), streaming);
    assert.match(html, /🚀/u);
    assert.match(html, /const answer = 42;/);
    assert.doesNotMatch(html.match(/<pre[\s\S]*?<\/pre>/)?.[0] ?? "", /data-sd-animate/);
  }

  const burst = renderToString(createElement(Markdown, {
    children: "突发文本".repeat(175), streaming: true,
  }));
  const delays = [...burst.matchAll(/--sd-delay:(\d+)ms/g)].map((match) => Number(match[1]));
  assert.ok(Math.max(0, ...delays) <= 200, "大段突发文本不能排队数秒才显示");
});
