import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

const metadata = { providerName: "test", protocolName: "test", requestedModel: "test" };
const completed = {
  type: "completed",
  response: { assistant: { parts: [{ type: "text", text: "answer" }] }, finish: { reason: "stop" }, usage: {}, metadata },
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function setup(t, gatewayFor = () => ({
  abort() {},
  async *stream() { yield { type: "started", metadata }; yield completed; },
})) {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createThreadStoreRegistry } = await server.ssrLoadModule("/src/chat/registry.ts");
  const { createWorkspaceStore } = await server.ssrLoadModule("/src/workspace/store.ts");
  const registry = createThreadStoreRegistry(gatewayFor);
  const store = createWorkspaceStore(registry);
  t.after(() => store.dispose());
  return { store, registry };
}

test("adapter 的规范目录按路径去重，保留 Windows 与虚拟路径；无效描述不改变状态", async (t) => {
  const { store } = await setup(t);
  assert.deepEqual(store.getState().workspaces, []);
  assert.deepEqual(store.getState().sessions, []);
  const directory = { path: "/Users/me/Projects/cognacta", name: "项目名称由 adapter 提供" };
  const workspace = store.addWorkspace(directory);
  assert.equal(workspace.path, directory.path);
  assert.equal(workspace.name, directory.name);
  assert.equal(store.addWorkspace({ ...directory, name: "重复目录" }), workspace);
  assert.equal(store.getState().workspaces.length, 1);
  assert.equal(store.getState().activeSessionId, null);
  const before = store.getState();
  for (const invalid of [
    { path: "", name: "项目" }, { path: "   ", name: "项目" },
    { path: "/project", name: "" }, { path: "/project", name: "   " },
    { path: "/a\nb", name: "项目" }, { path: "/a\0b", name: "项目" },
    { path: "/project", name: "a\nb" }, { path: "/project", name: "a\x7fb" },
  ]) {
    assert.throws(() => store.addWorkspace(invalid));
    assert.equal(store.getState(), before);
  }
  for (const directory of [
    { path: "C:\\Users\\me\\Projects\\cognacta", name: "Windows 项目" },
    { path: "workspace://tenant/project", name: "虚拟项目" },
  ]) {
    const saved = store.addWorkspace(directory);
    assert.equal(saved.path, directory.path);
    assert.equal(saved.name, directory.name);
  }
});

test("demo 目录 adapter 返回显示名称与规范路径，拒绝取消和不存在的目录", async t => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createDemoWorkspaceAccess } = await server.ssrLoadModule("/src/adapters/demo/workspace.ts");
  const access = createDemoWorkspaceAccess();
  const directories = await access.listDirectories();
  assert.deepEqual(directories[0], { path: "/workspace/cognacta", name: "cognacta" });
  assert.deepEqual(await access.resolveDirectory(" /workspace/cognacta/// "), directories[0]);
  await Promise.all(["", "   ", "/missing", "/workspace/cognacta\nbad"].map(path =>
    assert.rejects(access.resolveDirectory(path)),
  ));
});

test("无工作区即可新建会话，只有有效发送才成为非空会话", async (t) => {
  const { store, registry } = await setup(t);
  const id = store.startSession();
  assert.ok(id);
  assert.equal(store.getState().activeSessionId, id);
  assert.equal(store.getState().sessions[0].workspaceId, null);
  assert.equal(store.getState().sessions[0].blank, true);
  assert.deepEqual(store.getState().workspaces, []);
  assert.deepEqual(store.getState().expandedWorkspaceIds, []);
  for (let click = 0; click < 12; click += 1) assert.equal(store.startSession(), id);
  const thread = registry.get(id);
  assert.equal(thread.send("   "), false);
  assert.equal(store.getState().sessions[0].blank, true);
  assert.equal(thread.send("临时任务"), true);
  assert.equal(store.getState().sessions[0].blank, false);
  assert.equal(store.getState().sessions[0].title, "临时任务");
  const nextId = store.startSession();
  assert.notEqual(nextId, id);
  assert.equal(store.getState().sessions.filter((session) => session.workspaceId === null).length, 2);
  assert.equal(store.startSession(), nextId);
  await flush();
});

test("只有显式指定才绑定工作区，同组空会话复用，选择无工作区会话不展开目录", async (t) => {
  const { store, registry } = await setup(t);
  const first = store.addWorkspace({ path: "/projects/first", name: "first" });
  const second = store.addWorkspace({ path: "/projects/second", name: "second" });
  const unboundId = store.startSession();
  assert.equal(store.getState().sessions[0].workspaceId, null, "不继承最近添加的工作区");
  assert.equal(store.startSession(), unboundId);
  assert.deepEqual(store.getState().expandedWorkspaceIds, []);

  const secondId = store.startSession(second.id);
  assert.notEqual(secondId, unboundId);
  assert.equal(store.startSession(second.id), secondId);
  assert.equal(store.getState().sessions.find((session) => session.id === secondId).workspaceId, second.id);

  const firstId = store.startSession(first.id);
  store.addWorkspace({ path: "/projects/latest", name: "latest" });
  assert.equal(store.startSession(), unboundId, "不继承当前会话或最近添加的工作区");
  store.toggleWorkspace(first.id);
  assert.ok(!store.getState().expandedWorkspaceIds.includes(first.id));
  store.selectSession(firstId);
  assert.ok(store.getState().expandedWorkspaceIds.includes(first.id));
  assert.equal(store.getState().activeSessionId, firstId);
  assert.equal(store.getState().recentWorkspaceId, first.id);

  registry.get(firstId).send("开始第一轮");
  const nextId = store.startSession(first.id);
  assert.notEqual(nextId, firstId);
  for (let click = 0; click < 12; click += 1) assert.equal(store.startSession(first.id), nextId);
  assert.equal(store.getState().sessions.filter((session) => session.workspaceId === first.id).length, 2);
  const expandedBefore = store.getState().expandedWorkspaceIds;
  store.selectSession(unboundId);
  assert.equal(store.getState().activeSessionId, unboundId);
  assert.equal(store.getState().expandedWorkspaceIds, expandedBefore);
  assert.equal(store.getState().recentWorkspaceId, null);
  assert.equal(store.startSession(), unboundId);
  const before = store.getState();
  for (const id of ["missing", ""]) assert.equal(store.startSession(id), null);
  store.selectSession("missing");
  store.toggleWorkspace("missing");
  assert.equal(store.getState(), before);
  await flush();
});

test("后台生成保留引用，只有回合和状态边界广播，标题为首条用户消息", async (t) => {
  const content = Promise.withResolvers();
  const finish = Promise.withResolvers();
  let aborted = 0;
  let now = 100;
  t.mock.method(Date, "now", () => now);
  t.after(() => { content.resolve(); finish.resolve(); });
  const { store, registry } = await setup(t, () => ({
    abort() { aborted += 1; },
    async *stream() {
      yield { type: "started", metadata };
      yield { type: "part-started", partId: 0, kind: "text" };
      await content.promise;
      yield { type: "delta", partId: 0, text: "ans" };
      yield { type: "delta", partId: 0, text: "wer" };
      yield { type: "usage", usage: { outputTokens: 2 } };
      await finish.promise;
      yield completed;
    },
  }));
  const workspace = store.addWorkspace({ path: "/projects/test", name: "test" });
  const id = store.startSession(workspace.id);
  const thread = registry.get(id);
  let notices = 0;
  const unsubscribe = store.subscribe(() => { notices += 1; });
  assert.equal(thread.send("   "), false);
  assert.equal(store.getState().sessions[0].blank, true);
  now = 200;
  thread.send(`第一行\n 第二行 ${"😀".repeat(50)}`);
  const submitted = store.getState().sessions[0];
  assert.equal(submitted.blank, false);
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.updatedAt, 200);
  assert.ok(submitted.title.startsWith("第一行 第二行 "));
  assert.equal(Array.from(submitted.title).length, 49);
  assert.ok(submitted.title.endsWith("…"));
  now = 300;
  await flush();
  assert.equal(store.getState().sessions[0].status, "streaming");
  assert.equal(store.getState().sessions[0].updatedAt, 200);
  const nextId = store.startSession();
  registry.evictIdle();
  assert.equal(registry.get(id), thread, "侧边栏持有会话，切换后不被驱逐");
  assert.equal(aborted, 0);
  const before = store.getState();
  const beforeNotices = notices;
  content.resolve();
  await flush();
  assert.equal(store.getState(), before);
  assert.equal(notices, beforeNotices, "delta / usage 不广播工作区变化");
  assert.equal(thread.getState().messages.at(-1).parts[0].text, "answer");

  now = 400;
  finish.resolve();
  await flush();
  const done = store.getState().sessions.find((session) => session.id === id);
  assert.equal(done.status, "idle");
  assert.equal(done.updatedAt, 400);
  assert.equal(done.title, submitted.title);
  assert.equal(store.getState().activeSessionId, nextId);
  assert.equal(aborted, 0);
  now = 500;
  thread.send("第二轮使用不同标题");
  assert.equal(store.getState().sessions.find((session) => session.id === id).title, submitted.title);
  await flush();
  unsubscribe();
  store.dispose();
  registry.evictIdle();
  assert.equal(registry.snapshot(id), undefined);
  assert.equal(registry.snapshot(nextId), undefined);
});

test("失败、重试和停止同步到会话状态；dispose 不停止进行中的回复", async (t) => {
  const finish = Promise.withResolvers();
  let attempts = 0;
  let aborted = 0;
  t.after(() => finish.resolve());
  const { store, registry } = await setup(t, () => ({
    abort() { aborted += 1; },
    async *stream() {
      attempts += 1;
      if (attempts === 1) throw new Error("测试失败");
      yield { type: "started", metadata };
      await finish.promise;
      yield completed;
    },
  }));
  const workspace = store.addWorkspace({ path: "/project", name: "project" });
  const id = store.startSession(workspace.id);
  const thread = registry.get(id);
  thread.send("保留原始标题");
  await flush();
  assert.equal(store.getState().sessions[0].status, "failed");
  assert.equal(store.getState().sessions[0].blank, false);
  thread.retry();
  assert.equal(store.getState().sessions[0].status, "submitted");
  await flush();
  thread.stop();
  assert.equal(store.getState().sessions[0].status, "idle");
  assert.equal(aborted, 1);
  thread.retry();
  await flush();
  store.dispose();
  registry.evictIdle();
  assert.ok(registry.snapshot(id), "dispose 后仍生成的会话不会被驱逐");
  assert.equal(thread.streaming, true);
  assert.equal(aborted, 1, "释放工作区不调用 stop / abort");
  finish.resolve();
  await flush();
  assert.equal(thread.getState().messages.at(-1).state, "done");
  registry.evictIdle();
  assert.equal(registry.snapshot(id), undefined);
});
