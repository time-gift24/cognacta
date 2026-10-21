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
  return server.ssrLoadModule("/src/skills/content.ts")
}

test("frontmatter 只分离开头闭合块，保留空值、未知字段和原始换行", async (t) => {
  const { splitFrontmatter } = await setup(t)
  assert.deepEqual(
    splitFrontmatter("---\nname: test\nunknown:\n---\n\n# 正文\n"),
    {
      metadata: "name: test\nunknown:\n",
      body: "\n# 正文\n",
    }
  )
  assert.deepEqual(
    splitFrontmatter("---\r\nname: 测试\r\ncustom: []\r\n---\r\n# 正文\r\n"),
    {
      metadata: "name: 测试\r\ncustom: []\r\n",
      body: "# 正文\r\n",
    }
  )
  assert.deepEqual(splitFrontmatter("---\n---\n正文"), {
    metadata: "",
    body: "正文",
  })
  assert.deepEqual(splitFrontmatter("---\nname: test\n---"), {
    metadata: "name: test\n",
    body: "",
  })
  for (const source of [
    "",
    "---\nname: 未闭合\n# 正文",
    "前言\n---\nname: test\n---\n",
    "---\nname: test\n----\n正文",
  ]) {
    assert.deepEqual(splitFrontmatter(source), { metadata: null, body: source })
  }
})

test("Skill 名称和说明读取完整 YAML，拒绝缺失字段、重复键和非法值", async (t) => {
  const { readSkillMetadata } = await setup(t)
  assert.deepEqual(readSkillMetadata('---\nname: "跨页新技能"\ndescription: "验证新建和选择器同步"\n---\n'), { name: "跨页新技能", description: "验证新建和选择器同步" })
  assert.deepEqual(readSkillMetadata("---\r\nname: 'O''Brien 的技能'\r\ndescription: >-\r\n  第一行\r\n  第二行\r\ncustom: true\r\n---\r\n# 正文"), { name: "O'Brien 的技能", description: "第一行 第二行" })
  for (const source of ["# 缺少元信息", "---\nname: x\n---\n", "---\nname: \"\"\ndescription: text\n---\n", "---\nname: 123\ndescription: text\n---\n", "---\nname: a\nname: b\ndescription: text\n---\n", "---\nname: [broken\ndescription: text\n---\n", "---\nname: &alias x\ndescription: *alias\n---\n", `---\nname: ${"x".repeat(101)}\ndescription: text\n---\n`]) assert.throws(() => readSkillMetadata(source))
})

test("技能链接解析相对目录、中文编码和锚点，拒绝外部链接与非法编码", async (t) => {
  const { resolveSkillLink } = await setup(t)
  assert.deepEqual(
    resolveSkillLink("reference/metrics.md", "../SKILL.md#工作流程"),
    {
      path: "SKILL.md",
      hash: "工作流程",
    }
  )
  assert.deepEqual(
    resolveSkillLink(
      "reference/metrics.md",
      "./%E8%B5%84%E6%96%99.md#%E6%A0%87%E9%A2%98"
    ),
    {
      path: "reference/资料.md",
      hash: "标题",
    }
  )
  assert.deepEqual(resolveSkillLink("reference/资料.md", "#章节"), {
    path: "reference/资料.md",
    hash: "章节",
  })
  assert.deepEqual(resolveSkillLink("SKILL.md", "scripts/ss.js"), {
    path: "scripts/ss.js",
    hash: "",
  })
  for (const href of [
    "https://example.com/file.md",
    "https://skill.invalid/SKILL.md",
    "//example.com/file.md",
    "mailto:test@example.com",
    "javascript:alert(1)",
    "data:text/plain,test",
    "ht\ntps://skill.invalid/file.md",
    "\\\\example.com/file.md",
    "%ZZ.md",
    "%E0%A4.md",
    "SKILL.md#%E0",
    "SKILL.md?test=%GG",
  ]) {
    assert.equal(resolveSkillLink("SKILL.md", href), null, href)
  }
})

test("章节 slug 统一英文大小写、合并空白并保留中文", async (t) => {
  const { headingSlug } = await setup(t)
  assert.equal(headingSlug("  Hello   World!  "), "hello-world")
  assert.equal(headingSlug("何时使用？"), "何时使用")
  assert.equal(headingSlug("API / 数据 口径（v2）"), "api-数据-口径v2")
  assert.equal(headingSlug(" \n!? "), "section")
})
