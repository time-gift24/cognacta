import assert from "node:assert/strict"
import { test } from "node:test"
import { createServer } from "vite"

async function sources(t) {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  t.after(() => server.close())
  const resources = await server.ssrLoadModule(
    "/src/adapters/demo/resources.ts"
  )
  const skills = await server.ssrLoadModule("/src/adapters/demo/skills.ts")
  return { ...resources, ...skills }
}

test("Agent 来源保存完整配置，应用实例与调用方持有的数据互相隔离", async (t) => {
  const { createDemoAgentSource } = await sources(t)
  const first = createDemoAgentSource()
  const second = createDemoAgentSource()
  const initial = await first.load()
  const agent = initial.agents[0]
  const configuration = structuredClone(agent.configuration)
  configuration.name = "修改后的 Agent"
  configuration.instructions = "# 完整提示词\n\n- 保留 Markdown。\n"
  configuration.skillIds = ["weekly-report"]
  await first.save(agent.id, configuration)
  configuration.skillIds.push("another-skill")
  initial.resources.tools[0].name = "调用方修改"

  const saved = await first.load()
  assert.equal(saved.agents[0].configuration.name, "修改后的 Agent")
  assert.equal(
    saved.agents[0].configuration.instructions,
    "# 完整提示词\n\n- 保留 Markdown。\n"
  )
  assert.deepEqual(saved.agents[0].configuration.skillIds, ["weekly-report"])
  assert.notEqual(saved.resources.tools[0].name, "调用方修改")
  assert.equal(
    (await second.load()).agents[0].configuration.name,
    agent.configuration.name
  )
  assert.equal("icon" in saved.resources.mcpServers[0], false)

  await assert.rejects(first.save("missing-agent", configuration), /找不到/)
  await assert.rejects(
    first.save(agent.id, { ...configuration, name: " " }),
    /名称/
  )
  await assert.rejects(
    first.save(agent.id, { ...configuration, instructions: " " }),
    /系统提示词/
  )
  assert.deepEqual(await first.load(), saved)
})

test("技能原文与模型目录通过来源读取，调用方修改不改变下次读取", async (t) => {
  const { createDemoSkillSource, createDemoModelSource } = await sources(t)
  const skills = createDemoSkillSource()
  const models = createDemoModelSource()
  const original = await skills.list()
  const files = structuredClone(original[0].files)
  original[0].files[0].content = "本地草稿"
  assert.deepEqual((await skills.list())[0].files, files)
  const choices = await models.list()
  assert.equal(choices[0].id, "pine-1")
  choices[0].id = "调用方修改"
  assert.equal((await models.list())[0].id, "pine-1")
})

test("Agent 创建与复制更新目录，失败不新增；调用方与实例仍独立", async (t) => {
  const { createDemoAgentSource } = await sources(t)
  const source = createDemoAgentSource()
  const initial = await source.load()
  const created = await source.create()
  assert.equal(created.source, "local")
  assert.equal(created.configuration.name, "")
  assert.equal(created.configuration.instructions, "")
  await assert.rejects(source.save(created.id, created.configuration), /名称/)
  created.configuration.name = "调用方变更"
  assert.notEqual((await source.load()).agents.at(-1).configuration.name, created.configuration.name)
  const copy = await source.create({ copyFrom: initial.agents[0].id })
  assert.notEqual(copy.id, initial.agents[0].id)
  assert.match(copy.configuration.name, /副本/)
  assert.equal(copy.configuration.instructions, initial.agents[0].configuration.instructions)
  await source.save(copy.id, { ...copy.configuration, instructions: "独立副本" })
  assert.deepEqual((await source.load()).agents[0], initial.agents[0])
  const count = (await source.load()).agents.length
  await assert.rejects(source.create({ copyFrom: "missing" }), /找不到/)
  await assert.rejects(source.create({ configuration: { ...copy.configuration, name: " " } }), /名称/)
  assert.equal((await source.load()).agents.length, count)
  assert.equal((await createDemoAgentSource().load()).agents.length, initial.agents.length)
})
