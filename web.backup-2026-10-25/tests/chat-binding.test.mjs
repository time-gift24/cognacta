import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

async function loadModules(t) {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createThreadStoreRegistry } = await server.ssrLoadModule("/src/chat/registry.ts");
  const { createMockGateway } = await server.ssrLoadModule("/src/adapters/demo/chat.ts");
  return { createThreadStoreRegistry, createMockGateway };
}

async function waitFor(check) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > 3000) throw new Error("waitFor timeout");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("显式注入的注册表并发运行的线程独立停止，另一线程继续接收增量", async (t) => {
  const { createThreadStoreRegistry, createMockGateway } = await loadModules(t);
  const registry = createThreadStoreRegistry(() => createMockGateway());
  const first = registry.acquire("first");
  const second = registry.acquire("second");
  t.after(() => {
    first.stop();
    second.stop();
    registry.release("first");
    registry.release("second");
    registry.evictIdle();
  });

  first.send("first");
  second.send("second");
  await waitFor(() => first.getState().status === "streaming" && second.getState().status === "streaming");
  first.stop();
  await waitFor(() => second.getState().messages.at(-1).parts.some((part) => part.text));
  assert.equal(first.getState().messages.at(-1).state, "stopped");
  assert.equal(second.getState().messages.at(-1).state, "streaming");
  assert.equal(second.streaming, true);
});

test("注入工厂按线程创建网关，重新取得同一线程复用原实例", async (t) => {
  const { createThreadStoreRegistry } = await loadModules(t);
  const created = [];
  const registry = createThreadStoreRegistry((threadId) => {
    created.push(threadId);
    return { abort() {}, stream() { throw new Error("unexpected stream"); } };
  });
  const first = registry.acquire("first");
  assert.equal(registry.acquire("first"), first);
  assert.notEqual(registry.acquire("second"), first);
  assert.deepEqual(created, ["first", "second"]);
});
