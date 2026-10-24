import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString as renderHTML } from "react-dom/server";
import { createServer } from "vite";

test("思维链收起时隐藏内容并保留子步骤，运行中展开", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const dependencies = createTestDependencies();
  const renderToString = element => renderHTML(withDependencies(element, dependencies));
  const { ChainOfThought } = await server.ssrLoadModule("/src/components/chat/chain-of-thought.tsx");
  for (const streaming of [false, true]) {
    const html = renderToString(createElement(ChainOfThought, {
      parts: [{ kind: "reasoning", text: "检查构建日志", state: streaming ? "running" : "done" }],
      streaming, answering: false,
    }));
    const contentId = html.match(/<button[^>]*aria-controls="([^"]+)"/)?.[1];
    const content = [...html.matchAll(/<section\b[^>]*>/g)]
      .find(([tag]) => tag.includes(`id="${contentId}"`))?.[0];
    assert.ok(content);
    assert.equal(/\sinert(?:=|\s|>)/.test(content), !streaming);
    assert.equal(content.includes('aria-hidden="true"'), !streaming);
    assert.ok(!/\shidden(?:=|\s|>)/.test(content), "收起由布局过渡控制，不能立即 display:none");
    assert.ok(content.includes(streaming ? "grid-rows-[1fr]" : "grid-rows-[0fr]"),
      "开合交给 grid-template-rows 过渡");
    assert.ok(!/\sstyle="/.test(content), "不写测量高度内联样式，避免嵌套时二次高度动画");
    assert.equal((html.match(/data-slot="trace-disclosure"/g) ?? []).length, 2,
      "收起时仍保留组内思考子步骤");
    assert.match(html, streaming ? /正在思考…/ : /已思考/);
  }
});

test("思考完成由步骤事件决定；停止和失败不再旋转或显示完成", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const dependencies = createTestDependencies();
  const renderToString = element => renderHTML(withDependencies(element, dependencies));
  const { ChainOfThought } = await server.ssrLoadModule("/src/components/chat/chain-of-thought.tsx");
  for (const [partState, messageState, title, summary, spinning] of [
    ["running", "streaming", "正在思考…", "正在思考…", true],
    ["done", "streaming", "已思考", "正在等待回复…", true],
    ["running", "stopped", "思考已停止", "研究已停止", false],
    ["running", "failed", "思考中断", "研究中断", false],
    ["done", "stopped", "已思考", "已研究 1 步", false],
    ["done", "failed", "已思考", "已研究 1 步", false],
  ]) {
    const html = renderToString(createElement(ChainOfThought, {
      parts: [{ kind: "reasoning", text: "已收到部分思考内容", state: partState }],
      streaming: messageState === "streaming", messageState, answering: false,
    }));
    assert.ok(html.includes(title), `${partState} / ${messageState}: ${title}`);
    assert.ok(html.includes(summary), `${partState} / ${messageState}: ${summary}`);
    assert.equal(html.includes('data-variant="orbit"'), spinning);
    assert.equal(html.includes('data-variant="diamond"'), partState === "running" && messageState === "streaming");
    if (partState === "running") assert.ok(!html.includes("已思考"));
  }
});

test("组内等待保持活动提示，正文接管后完成，步骤自身保持已完成", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const dependencies = createTestDependencies();
  const renderToString = element => renderHTML(withDependencies(element, dependencies));
  const { ChainOfThought } = await server.ssrLoadModule("/src/components/chat/chain-of-thought.tsx");
  for (const answering of [false, true]) {
    const html = renderToString(createElement(ChainOfThought, {
      parts: [
        { kind: "reasoning", text: "已检查", state: "done" },
        { kind: "tool", name: "searchCode", callId: "c1", inputText: "{}", state: "done" },
      ],
      streaming: true, answering,
    }));
    assert.ok(html.includes("已思考"));
    assert.ok(html.includes("已搜索代码"));
    assert.ok(html.includes(answering ? "已研究 2 步" : "正在等待回复…"));
    assert.equal(html.includes('data-variant="orbit"'), !answering);
  }
});

test("思考预览只在段首行完整后更新，完成或停止后保留首行", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const dependencies = createTestDependencies();
  const renderToString = element => renderHTML(withDependencies(element, dependencies));
  const { ChainOfThought } = await server.ssrLoadModule("/src/components/chat/chain-of-thought.tsx");
  for (const [text, messageState, preview] of [
    ["**第一阶段还在写", "streaming", ""],
    ["**第一阶段**\n检查日志", "streaming", "第一阶段"],
    ["**第一阶段**\n检查日志\n\n第二阶段还在写", "streaming", "第一阶段"],
    ["**第一阶段**\n检查日志\n\n**第二阶段**\n检查缓存", "streaming", "第二阶段"],
    ["**第一阶段**\n\n第二阶段", "done", "第一阶段"],
    ["**第一阶段**\n\n第二阶段", "stopped", "第一阶段"],
  ]) {
    const html = renderToString(createElement(ChainOfThought, {
      parts: [{ kind: "reasoning", text, state: messageState === "done" ? "done" : "running" }],
      streaming: messageState === "streaming", messageState, answering: false,
    }));
    const detail = html.match(/data-slot="trace-detail"[^>]*>(.*?)<\/span>/s)?.[1] ?? "";
    assert.equal(detail, preview ? ` · ${preview}` : "", `${messageState}: ${text}`);
    if (messageState === "stopped") {
      assert.ok(html.includes("思考已停止"));
      assert.ok(!html.includes("beui-ai-loader"));
    }
  }
});

test("工具摘要优先当前活动，仅显示完整参数中受控的单行短详情", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const dependencies = createTestDependencies();
  const renderToString = element => renderHTML(withDependencies(element, dependencies));
  const { ChainOfThought } = await server.ssrLoadModule("/src/components/chat/chain-of-thought.tsx");
  const render = (inputText, messageState = "streaming") => renderToString(createElement(ChainOfThought, {
    parts: [
      { kind: "reasoning", text: "检查来源\n", state: "done" },
      { kind: "tool", name: "readBuildLog", callId: "c0", inputText: '{"deployment":"dpl_old"}', state: "done" },
      { kind: "tool", name: "searchCode", callId: "c1", inputText, state: "running" },
    ],
    streaming: messageState === "streaming", messageState, answering: false,
  }));
  const summary = (html) => html.match(/data-slot="trace-title"[^>]*>(.*?)<\/span>/s)?.[1];
  for (const input of ['{"query":"not-complete', '{"token":"private-value"}', '{"query":{"raw":"private-value"}}']) {
    const html = render(input);
    assert.equal(summary(html), "正在搜索代码…");
    assert.ok(!html.includes("not-complete") && !html.includes("private-value"));
  }
  const html = render('{"query":"cacheKey\\n  next.config.ts"}');
  assert.equal(summary(html), "正在搜索代码…");
  assert.ok(html.includes(" · cacheKey next.config.ts"));
  assert.ok(html.includes("已思考") && html.includes("已读取构建日志"));

  const grapheme = "👩🏽‍💻";
  const longDetail = grapheme.repeat(100);
  const truncated = render(JSON.stringify({ query: longDetail }), "stopped");
  assert.ok(truncated.includes(`${grapheme.repeat(79)}…`));
  assert.ok(!truncated.includes(longDetail));
  assert.ok(truncated.includes("研究已停止") && truncated.includes("已停止搜索代码"));
  assert.ok(!truncated.includes("beui-ai-loader") && !truncated.includes("正在搜索代码"));
  for (const count of [79, 80, 81, 100_000]) {
    const bounded = render(JSON.stringify({ query: grapheme.repeat(count) }), "stopped");
    const detail = bounded.match(/data-slot="trace-detail"[^>]*>(.*?)<\/span>/s)?.[1];
    assert.equal(detail, ` · ${count > 80 ? `${grapheme.repeat(79)}…` : grapheme.repeat(count)}`);
  }
});

test("工具进行中结束回复也移除旋转状态", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const dependencies = createTestDependencies();
  const renderToString = element => renderHTML(withDependencies(element, dependencies));
  const { ChainOfThought } = await server.ssrLoadModule("/src/components/chat/chain-of-thought.tsx");
  for (const messageState of ["stopped", "failed"]) {
    const html = renderToString(createElement(ChainOfThought, {
      parts: [{ kind: "tool", name: "searchCode", callId: "c1", inputText: "{}", state: "running" }],
      streaming: false, messageState, answering: false,
    }));
    assert.ok(html.includes(messageState === "stopped" ? "已停止搜索代码" : "搜索代码中断"));
    assert.ok(!html.includes("beui-ai-loader"));
  }
});

test("已研究展开区有界内滚，步骤再多也不撑开线程", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const dependencies = createTestDependencies();
  const renderToString = element => renderHTML(withDependencies(element, dependencies));
  const { ChainOfThought } = await server.ssrLoadModule("/src/components/chat/chain-of-thought.tsx");
  const html = renderToString(createElement(ChainOfThought, {
    parts: [
      { kind: "reasoning", text: "已检查缓存", state: "done" },
      { kind: "tool", name: "searchCode", callId: "c1", inputText: '{"query":"cacheKey"}', state: "done", output: { files: ["a.ts"] } },
    ],
    streaming: true, answering: false,
  }));
  const bodies = [...html.matchAll(/<div[^>]*data-slot="trace-disclosure-body"[^>]*>/g)].map(([tag]) => tag);
  assert.equal(bodies.length, 3, "外层摘要与每个步骤各自保留内容体");
  assert.match(bodies[0], /max-h-\[min\(60vh,28rem\)\]/);
  assert.match(bodies[0], /overflow-y-auto/);
  assert.match(bodies[0], /overscroll-contain/);
  for (const nested of bodies.slice(1)) {
    assert.ok(!nested.includes("overflow-y-auto"), "步骤内容不再套一层内滚，随摘要区一起滚动");
  }
});

test("工具名与对象原型属性重名时仍显示原始名称", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const dependencies = createTestDependencies();
  const renderToString = element => renderHTML(withDependencies(element, dependencies));
  const { ChainOfThought } = await server.ssrLoadModule("/src/components/chat/chain-of-thought.tsx");
  for (const name of ["constructor", "__proto__", "toString"]) {
    const html = renderToString(createElement(ChainOfThought, {
      parts: [{ kind: "tool", name, callId: "c1", inputText: "{}", state: "running" }],
      streaming: true, answering: false,
    }));
    assert.ok(html.includes(`正在执行 ${name}…`));
    assert.ok(!html.includes("[object Object]") && !html.includes("[native code]"));
  }
});
