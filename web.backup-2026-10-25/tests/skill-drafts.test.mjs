import assert from "node:assert/strict"
import { test } from "node:test"
import { createServer } from "vite"

async function setup(t) {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  t.after(() => server.close())
  const { fileKey } = await server.ssrLoadModule("/src/skills/drafts.ts")
  const { createBrowserStorage } = await server.ssrLoadModule("/src/adapters/browser-storage.ts")
  const { DEMO_SKILLS } = await server.ssrLoadModule("/src/adapters/demo/skills.ts")
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: (key) => { values.delete(key) },
  }
  const create = (backendId = "demo", providedStorage = storage) => createBrowserStorage(backendId, {
    getStorage: () => providedStorage,
    events: { addEventListener() {}, removeEventListener() {} },
  }).skillDrafts
  return { fileKey, DEMO_SKILLS, storage, values, create, cache: create() }
}

test("草稿按技能和文件隔离，完整源码与空内容重新加载后保留", async (t) => {
  const { fileKey, DEMO_SKILLS, values, cache } = await setup(t)
  assert.deepEqual(await cache.load(DEMO_SKILLS), {})
  for (const skill of DEMO_SKILLS) {
    for (const file of skill.files) await cache.save(skill.id, file.path, file.content)
  }
  await cache.save(DEMO_SKILLS[0].id, "reference/template.md", "")
  const restored = await cache.load(DEMO_SKILLS)
  for (const skill of DEMO_SKILLS) {
    for (const file of skill.files) {
      const expected = file.path === "reference/template.md" ? "" : file.content
      assert.equal(restored[fileKey(skill.id, file.path)], expected)
    }
  }
  assert.notEqual(fileKey("a/b", "c"), fileKey("a", "b/c"))
  assert.ok([...values.keys()].every(key => key.startsWith("cognacta:skill-draft:v1:")))
})

test("旧品牌草稿可读取，保存迁移到新键且删除不会复活", async (t) => {
  const { fileKey, DEMO_SKILLS, cache, values, create } = await setup(t)
  const skill = DEMO_SKILLS[0]
  const file = skill.files[0]
  const legacyKey = `omniops-bots:skill-draft:v1:${fileKey(skill.id, file.path)}`
  const currentKey = `cognacta:skill-draft:v1:${fileKey(skill.id, file.path)}`
  const otherLegacyKey = `omniops-bots:skill-draft:v1:${fileKey(skill.id, skill.files[1].path)}`
  values.set(legacyKey, "旧版草稿")
  values.set(otherLegacyKey, "保留另一个文件")
  assert.deepEqual((await cache.load(DEMO_SKILLS)), {
    [fileKey(skill.id, file.path)]: "旧版草稿",
    [fileKey(skill.id, skill.files[1].path)]: "保留另一个文件",
  })
  await cache.save(skill.id, file.path, "新版本")
  assert.equal(values.get(currentKey), "新版本")
  assert.equal(values.has(legacyKey), false)
  await cache.remove(skill.id, file.path)
  await cache.remove(skill.id, skill.files[1].path)
  const restored = await create().load(DEMO_SKILLS)
  assert.deepEqual(restored, {})
  assert.equal(values.has(legacyKey), false)
  assert.equal(values.has(otherLegacyKey), false)
  assert.equal(values.has(currentKey), false)
})

test("存储读取、写入和删除失败通过Promise传出，已有草稿不变", async (t) => {
  const { fileKey, DEMO_SKILLS, storage, create, cache } = await setup(t)
  const skill = DEMO_SKILLS[0]
  const file = skill.files[0]
  await cache.save(skill.id, file.path, "之前保存的版本")
  const failure = new Error("storage unavailable")
  const fail = () => { throw failure }
  await assert.rejects(create("demo", { ...storage, getItem: fail }).load(DEMO_SKILLS), error => error === failure)
  await assert.rejects(create("demo", { ...storage, setItem: fail }).save(skill.id, file.path, "新版本"), error => error === failure)
  await assert.rejects(create("demo", { ...storage, removeItem: fail }).remove(skill.id, file.path), error => error === failure)
  assert.equal((await cache.load(DEMO_SKILLS))[fileKey(skill.id, file.path)], "之前保存的版本")
})

test("两个后端的草稿命名空间互不读取、覆盖或删除，也不回退demo", async (t) => {
  const { fileKey, DEMO_SKILLS, create, cache } = await setup(t)
  const skill = DEMO_SKILLS[0]
  const file = skill.files[0]
  const key = fileKey(skill.id, file.path)
  await cache.save(skill.id, file.path, "demo")
  const web = create("web:https://example.com/a")
  const desktop = create("desktop:local")
  assert.deepEqual(await web.load(DEMO_SKILLS), {})
  assert.deepEqual(await desktop.load(DEMO_SKILLS), {})
  await web.save(skill.id, file.path, "web")
  await desktop.save(skill.id, file.path, "desktop")
  assert.equal((await web.load(DEMO_SKILLS))[key], "web")
  assert.equal((await desktop.load(DEMO_SKILLS))[key], "desktop")
  await web.remove(skill.id, file.path)
  assert.equal((await web.load(DEMO_SKILLS))[key], undefined)
  assert.equal((await desktop.load(DEMO_SKILLS))[key], "desktop")
  assert.equal((await cache.load(DEMO_SKILLS))[key], "demo")
})
