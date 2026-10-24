import assert from "node:assert/strict"
import { test } from "node:test"
import { createServer } from "vite"

async function setup(t) {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
  t.after(() => server.close())
  const { createBrowserStorage } = await server.ssrLoadModule("/src/adapters/browser-storage.ts")
  const { loadInitialThemePreferences } = await server.ssrLoadModule("/src/preferences/theme.ts")
  const values = new Map()
  const listeners = new Set()
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
  }
  const events = {
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  }
  const create = (backendId = "demo", getStorage = () => storage) => createBrowserStorage(backendId, { getStorage, events }).themePreferences
  const notify = (key, newValue, storageArea = storage) => {
    for (const listener of listeners) listener({ key, newValue, storageArea })
  }
  return { create, storage, values, listeners, notify, loadInitialThemePreferences }
}

test("主题预读的两项失败独立回退，访问被拒绝不阻止订阅清理", async t => {
  const { create, values, storage, loadInitialThemePreferences } = await setup(t)
  const fail = () => { throw new Error("denied") }
  values.set("theme", "dark")
  values.set("omniops-bots-palette", "claude")
  for (const blocked of ["theme", "omniops-bots-palette"]) {
    const preferences = create("demo", () => ({ ...storage, getItem: key => key === blocked ? fail() : storage.getItem(key) }))
    assert.deepEqual(await loadInitialThemePreferences(preferences, "light"), {
      theme: blocked === "theme" ? "light" : "dark",
      palette: blocked === "omniops-bots-palette" ? "official" : "claude",
    })
  }
  const denied = create("demo", fail)
  assert.deepEqual(await loadInitialThemePreferences(denied), { theme: "system", palette: "official" })
  assert.doesNotThrow(() => denied.subscribe(() => {})())
  await assert.rejects(denied.writeTheme("dark"), /denied/)
})

test("主题与配色隔离后端身份，只有demo读取legacy", async t => {
  const { create, values, loadInitialThemePreferences } = await setup(t)
  values.set("theme", "dark")
  values.set("omniops-bots-palette", "claude")
  const demo = create()
  const web = create("web")
  const desktop = create("desktop")
  assert.deepEqual(await loadInitialThemePreferences(demo), { theme: "dark", palette: "claude" })
  assert.deepEqual(await loadInitialThemePreferences(web), { theme: "system", palette: "official" })
  await web.writeTheme("light")
  await web.writePalette("claude")
  await desktop.writeTheme("dark")
  assert.equal(values.get("cognacta:backend:web:cognacta-palette"), "claude")
  assert.equal(values.has("omniops-bots:backend:web:omniops-bots-palette"), false)
  assert.deepEqual(await loadInitialThemePreferences(web), { theme: "light", palette: "claude" })
  assert.deepEqual(await loadInitialThemePreferences(desktop), { theme: "dark", palette: "official" })
  assert.deepEqual(await loadInitialThemePreferences(demo), { theme: "dark", palette: "claude" })
})

test("浏览器storage事件转换为同身份平台无关通知，含无效值、删除和清空", async t => {
  const { create, values, notify, listeners } = await setup(t)
  const changes = []
  const preferences = create("web")
  await preferences.writeTheme("dark")
  await preferences.writePalette("claude")
  const themeKey = [...values.keys()].find(key => key.endsWith(":theme"))
  const paletteKey = [...values.keys()].find(key => key.endsWith(":cognacta-palette"))
  const stop = preferences.subscribe(change => changes.push(change))
  notify("theme", "light")
  notify(themeKey, "light", {})
  notify(themeKey, "light")
  notify(paletteKey, "official")
  notify(themeKey, "invalid")
  notify(paletteKey, null)
  notify(null, null)
  assert.deepEqual(changes, [{ theme: "light" }, { palette: "official" }, { theme: null }, { palette: null }, { theme: null, palette: null }])
  stop()
  assert.equal(listeners.size, 0)
})
