import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

test("explicit dependency graphs isolate same-ID threads, drafts, preferences and UI providers", async t => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { createTestDependencies, withDependencies } = await server.ssrLoadModule("/tests/support.tsx");
  const { createAppDependencies, useAppDependencies } = await server.ssrLoadModule("/src/app/dependencies.tsx");
  const requests = [[], []];
  const backends = ["web-a", "desktop-b"].map((backendId, index) => createTestDependencies({
    backendId,
    gatewayFor: threadId => ({
      abort() {},
      async *stream(request) {
        requests[index].push({ threadId, request });
        yield { type: "failed", error: { kind: "unavailable", message: backendId } };
      },
    }),
  }));
  const [web, desktop] = backends;
  const webThread = web.threads.get("same-thread");
  const desktopThread = desktop.threads.get("same-thread");
  assert.notEqual(webThread, desktopThread);
  webThread.updateDraft({ text: "web draft", model: "model-a" });
  desktopThread.updateDraft({ text: "desktop draft", model: "model-b" });
  webThread.send("web request");
  desktopThread.send("desktop request");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(requests[0][0].request.messages[0].text, "web request");
  assert.equal(requests[1][0].request.messages[0].text, "desktop request");
  assert.equal(webThread.getDraft().text, "web draft");
  assert.equal(desktopThread.getDraft().text, "desktop draft");
  assert.equal(webThread.getState().error.message, "web-a");
  assert.equal(desktopThread.getState().error.message, "desktop-b");

  const skills = [{ id: "same-skill", files: [{ path: "SKILL.md" }] }];
  await web.skillDrafts.save("same-skill", "SKILL.md", "web source");
  await desktop.skillDrafts.save("same-skill", "SKILL.md", "desktop source");
  assert.deepEqual(Object.values(await web.skillDrafts.load(skills)), ["web source"]);
  assert.deepEqual(Object.values(await desktop.skillDrafts.load(skills)), ["desktop source"]);
  await web.skillDrafts.remove("same-skill", "SKILL.md");
  assert.deepEqual(await web.skillDrafts.load(skills), {});
  assert.deepEqual(Object.values(await desktop.skillDrafts.load(skills)), ["desktop source"]);
  await web.preferences.writeTheme("dark");
  await desktop.preferences.writeTheme("light");
  assert.equal(await web.preferences.readTheme(), "dark");
  assert.equal(await desktop.preferences.readTheme(), "light");

  function Probe() { return createElement("p", null, useAppDependencies().backendId); }
  for (const dependencies of backends) {
    assert.equal(renderToString(withDependencies(createElement(Probe), dependencies)), `<p>${dependencies.backendId}</p>`);
  }
  assert.throws(() => renderToString(createElement(Probe)), /AppDependenciesProvider is required/);
  assert.throws(() => createAppDependencies({ ...web, backendId: " " }), /backendId/);
});
