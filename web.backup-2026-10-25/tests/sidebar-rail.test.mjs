import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

test("SidebarRail renders on the server without mounting browser portals", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => server.close());
  const { useHydrated } = await server.ssrLoadModule("/src/lib/hooks/use-hydrated.ts");
  assert.equal(renderToString(createElement(() => String(useHydrated()))), "false");
  const { SidebarRail } = await server.ssrLoadModule(
    "/src/components/premium/sidebar-blocks/sidebar-rail.tsx",
  );
  const html = renderToString(createElement(SidebarRail, { workspaceName: "cognacta" }));
  assert.match(html, /cognacta/);
  assert.match(html, /aria-label="工作区导航区域"/);
  assert.match(html, /aria-label="面包屑"/);
  assert.doesNotMatch(html, /role="tooltip"/);
  const controlled = renderToString(createElement(SidebarRail, {
    activeSectionId: "settings",
    activeItemId: "members",
    workspaceHeaderClassName: "pr-10",
  }));
  assert.match(controlled, /aria-label="设置" aria-current="page"/);
  assert.match(controlled, /data-slot="sidebar-rail-workspace-header" class="[^"]*pr-10/);
  assert.match(controlled, /aria-label="面包屑"[^]*?<span[^>]*>设置<\/span>[^]*?<li[^>]*aria-current="page"[^]*?<span[^>]*>成员<\/span>/);
  assert.doesNotMatch(controlled, /发布方向/);
  const { Breadcrumbs } = await server.ssrLoadModule("/src/components/ui/breadcrumbs.tsx");
  const breadcrumbs = renderToString(createElement(Breadcrumbs, {
    items: [
      { label: "上级", onSelect() {} },
      { label: "当前页", onSelect() {} },
    ],
  }));
  assert.equal((breadcrumbs.match(/<button\b/g) ?? []).length, 1);
  assert.match(breadcrumbs, /<button[^>]*type="button"[^>]*>上级<\/button>/);
  assert.match(breadcrumbs, /<li aria-current="page"[^>]*>[^]*<span[^>]*>当前页<\/span><\/li>/);
});
