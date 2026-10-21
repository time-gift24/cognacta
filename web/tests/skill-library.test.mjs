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
  const module = await server.ssrLoadModule("/src/skills/library.ts")
  const originals = [
    {
      id: "seed",
      name: "预置本地 Skill",
      description: "来自原件",
      files: [
        { path: "SKILL.md", content: "原始内容" },
        { path: "reference/readme.md", content: "参考资料" },
      ],
    },
    {
      id: "official",
      name: "官方 Skill",
      description: "不可变发布包",
      origin: "official",
      version: "v.1.0.0",
      files: [{ path: "SKILL.md", content: "官方原文" }],
    },
  ]
  const documents = new Map()
  const legacy = new Map([[JSON.stringify(["seed", "SKILL.md"]), "旧版草稿"]])
  let failure = false
  let serial = 0
  const persistence = {
    async load() {
      return structuredClone([...documents.values()])
    },
    async save(document) {
      if (failure) throw new Error("磁盘配额已满")
      documents.set(document.id, structuredClone(document))
    },
    async remove(id) {
      if (failure) throw new Error("删除失败")
      documents.delete(id)
    },
  }
  const create = () =>
    module.createSkillLibrary({
      source: {
        async list() {
          return structuredClone(originals)
        },
      },
      legacyDrafts: {
        async load() {
          return Object.fromEntries(legacy)
        },
        async save() {
          throw new Error("不得写旧缓存")
        },
        async remove() {
          throw new Error("不得删旧缓存")
        },
      },
      persistence,
      storage: { kind: "browser", root: "测试库" },
      createId: () => `created-${++serial}`,
      now: () => "2026-10-19T00:00:00.000Z",
    })
  return {
    ...module,
    originals,
    legacy,
    documents,
    persistence,
    create,
    library: create(),
    setFailure: (value) => {
      failure = value
    },
  }
}

test("完整包保存新增文本、二进制和空目录，重建实例后保留；原件与旧缓存不变", async (t) => {
  const { library, create, originals, legacy } = await setup(t)
  assert.equal(
    await (await library.readFile("seed", "SKILL.md")).text(),
    "旧版草稿"
  )
  const created = await library.create({
    name: "新 Skill",
    description: "文件管理",
  })
  assert.match(
    await (await library.readFile(created.id, "SKILL.md")).text(),
    /description: "文件管理"/
  )
  await library.createDirectory(created.id, "assets")
  await library.createDirectory(created.id, "assets/empty")
  const bytes = new Uint8Array([0, 255, 13, 128, 0, 10])
  await library.writeFile(
    created.id,
    "assets/data.bin",
    new Blob([bytes], { type: "application/octet-stream" })
  )
  await library.writeFile(created.id, "empty.txt", new Blob([]))
  const reopened = create()
  assert.deepEqual(
    new Uint8Array(
      await (
        await reopened.readFile(created.id, "assets/data.bin")
      ).arrayBuffer()
    ),
    bytes
  )
  assert.equal((await reopened.readFile(created.id, "empty.txt")).size, 0)
  assert.ok(
    (await reopened.get(created.id)).entries.some(
      (entry) => entry.path === "assets/empty" && entry.kind === "folder"
    )
  )
  assert.equal(originals[0].files[0].content, "原始内容")
  assert.equal(legacy.get(JSON.stringify(["seed", "SKILL.md"])), "旧版草稿")
})

test("创建一次提交完整初始正文，超限或存储失败不留下新包", async (t) => {
  const {
    library,
    create,
    persistence,
    documents,
    setFailure,
    MAX_SKILL_FILE_BYTES,
  } = await setup(t)
  const content =
    "---\nname: 初始正文\ndescription: 草稿\n---\n\n# 用户编辑\n精确保存。\n"
  let saves = 0
  const save = persistence.save
  persistence.save = async (skill) => {
    saves++
    await save(skill)
  }
  const skill = await library.create({ name: "初始正文", content })
  assert.equal(saves, 1)
  assert.equal(
    await (await create().readFile(skill.id, "SKILL.md")).text(),
    content
  )
  await assert.rejects(
    library.create({
      name: "过大正文",
      content: "文".repeat(Math.floor(MAX_SKILL_FILE_BYTES / 3) + 1),
    }),
    { code: "storage" }
  )
  assert.equal(saves, 1, "校验必须在提交之前")
  assert.equal(documents.size, 1)
  setFailure(true)
  await assert.rejects(library.create({ name: "存储失败", content }), {
    code: "storage",
  })
  assert.equal(documents.size, 1)
  setFailure(false)
  const empty = await library.create({ name: "空正文", content: "" })
  assert.equal((await library.readFile(empty.id, "SKILL.md")).size, 0)
})

test("替换必须明确；目录与大小写冲突不覆盖；重命名与删除保留完整目录关系", async (t) => {
  const { library, create } = await setup(t)
  await assert.rejects(
    library.writeFile("seed", "SKILL.md", new Blob(["意外覆盖"])),
    { code: "conflict" }
  )
  await assert.rejects(
    library.writeFile("seed", "skill.md", new Blob(["大小写覆盖"]), {
      replace: true,
    }),
    { code: "conflict" }
  )
  await assert.rejects(
    library.writeFile("seed", "reference", new Blob(["目录覆盖"]), {
      replace: true,
    }),
    { code: "conflict" }
  )
  await library.writeFile("seed", "SKILL.md", new Blob(["新内容"]), {
    replace: true,
  })
  await library.createDirectory("seed", "docs")
  await library.rename("seed", "reference", "docs/guides")
  assert.equal(
    await (await library.readFile("seed", "docs/guides/readme.md")).text(),
    "参考资料"
  )
  await assert.rejects(library.rename("seed", "docs", "docs/child"), {
    code: "path-invalid",
  })
  await library.remove("seed", "docs")
  assert.ok(
    (await create().get("seed")).entries.every(
      (entry) => !entry.path.startsWith("docs")
    )
  )
  await library.deleteSkill("seed")
  assert.ok(
    (await create().list()).every((skill) => skill.id !== "seed"),
    "删除预置本地包不应在重载后复活"
  )
})

test("官方包只读且忽略旧草稿；复制生成无发布标签的可编辑本地完整包", async (t) => {
  const { library, legacy, documents } = await setup(t)
  legacy.set(JSON.stringify(["official", "SKILL.md"]), "不允许的旧草稿")
  assert.equal(
    await (await library.readFile("official", "SKILL.md")).text(),
    "官方原文"
  )
  for (const operation of [
    () =>
      library.writeFile("official", "SKILL.md", new Blob(["覆盖"]), {
        replace: true,
      }),
    () => library.createDirectory("official", "assets"),
    () => library.rename("official", "SKILL.md", "OTHER.md"),
    () => library.remove("official", "SKILL.md"),
    () => library.deleteSkill("official"),
  ])
    await assert.rejects(operation(), { code: "read-only" })
  assert.equal(documents.size, 0)
  const copied = await library.copyToLocal("official")
  assert.equal(copied.origin, "local")
  assert.equal(copied.version, undefined)
  assert.equal(copied.readOnly, false)
  await library.writeFile(copied.id, "SKILL.md", new Blob(["本地改动"]), {
    replace: true,
  })
  assert.equal(
    await (await library.readFile("official", "SKILL.md")).text(),
    "官方原文"
  )
})

test("保存或删除失败不损坏已提交包，下一次操作可继续", async (t) => {
  const { library, create, setFailure } = await setup(t)
  const created = await library.create({ name: "失败恢复" })
  await library.writeFile(created.id, "state.txt", new Blob(["已提交"]))
  setFailure(true)
  await assert.rejects(
    library.writeFile(created.id, "state.txt", new Blob(["未提交"]), {
      replace: true,
    }),
    { code: "storage" }
  )
  await assert.rejects(library.remove(created.id, "state.txt"), {
    code: "storage",
  })
  await assert.rejects(library.deleteSkill(created.id), { code: "storage" })
  setFailure(false)
  assert.equal(
    await (await create().readFile(created.id, "state.txt")).text(),
    "已提交"
  )
  await library.writeFile(created.id, "new.txt", new Blob(["继续保存"]))
  assert.equal(
    await (await library.readFile(created.id, "new.txt")).text(),
    "继续保存"
  )
})

test("拒绝路径越界和超大文件，排队的并发文件写入均保留", async (t) => {
  const { library, MAX_SKILL_FILE_BYTES } = await setup(t)
  for (const path of [
    "../outside",
    "/absolute",
    "a/../b",
    "a//b",
    "a\\b",
    "C:/file",
    "a\n.md",
    "CON.txt",
    "file.",
    "folder /x",
    "",
  ])
    await assert.rejects(
      library.writeFile("seed", path, new Blob(["内容"])),
      { code: "path-invalid" },
      path
    )
  await assert.rejects(
    library.writeFile(
      "seed",
      "large.bin",
      new Blob([new Uint8Array(MAX_SKILL_FILE_BYTES + 1)])
    ),
    { code: "storage" }
  )
  await library.createDirectory("seed", "parallel")
  await Promise.all([
    library.writeFile("seed", "parallel/a.txt", new Blob(["a"])),
    library.writeFile("seed", "parallel/b.txt", new Blob(["b"])),
  ])
  const paths = (await library.get("seed")).entries.map((entry) => entry.path)
  assert.ok(paths.includes("parallel/a.txt"))
  assert.ok(paths.includes("parallel/b.txt"))
})

test("目标目录被删除后上传、新建及移动失败，不改根也不重建；复制不补回已删除入口", async (t) => {
  const { library, create } = await setup(t)
  await library.remove("seed", "reference")
  await assert.rejects(
    library.writeFile("seed", "reference/new.md", new Blob(["未写入"])),
    { code: "not-found" }
  )
  await assert.rejects(library.createDirectory("seed", "reference/new"), {
    code: "not-found",
  })
  await assert.rejects(
    library.rename("seed", "SKILL.md", "reference/SKILL.md"),
    { code: "not-found" }
  )
  await assert.rejects(library.rename("seed", "SKILL.md", "skill.md"), {
    code: "conflict",
  })
  assert.deepEqual(
    (await create().get("seed")).entries.map((entry) => entry.path),
    ["SKILL.md"]
  )
  await library.remove("seed", "SKILL.md")
  const copy = await library.copyToLocal("seed")
  assert.deepEqual(copy.entries, [], "复制完整包不生成源包中不存在的SKILL.md")
})

test("包大小与条目上限一致，失败保留已有内容；保留临时文件名与过深路径不能上传", async (t) => {
  const { library, documents, MAX_SKILL_FILE_BYTES, MAX_SKILL_ENTRIES } =
    await setup(t)
  const largeBlob = new Blob([new Uint8Array(MAX_SKILL_FILE_BYTES)])
  const full = {
    id: "full",
    name: "完整包容量",
    description: "",
    origin: "local",
    modifiedAt: null,
    entries: Array.from({ length: 5 }, (_, i) => ({
      path: `${i}.bin`,
      kind: "file",
      size: largeBlob.size,
      mimeType: "application/octet-stream",
      modifiedAt: null,
      content: largeBlob,
    })),
  }
  documents.set(full.id, full)
  await assert.rejects(
    library.writeFile(full.id, "overflow.txt", new Blob(["x"])),
    { code: "storage" }
  )
  assert.equal((await library.get(full.id)).entries.length, 5)
  documents.delete(full.id)
  const emptyBlob = new Blob([])
  documents.set(full.id, {
    ...full,
    entries: Array.from({ length: MAX_SKILL_ENTRIES }, (_, i) => ({
      path: `${i}.txt`,
      kind: "file",
      size: 0,
      mimeType: "text/plain",
      modifiedAt: null,
      content: emptyBlob,
    })),
  })
  await assert.rejects(library.createDirectory(full.id, "overflow"), {
    code: "storage",
  })
  assert.equal((await library.get(full.id)).entries.length, MAX_SKILL_ENTRIES)
  for (const path of [".pending-file", `${"dir/".repeat(32)}file.txt`])
    await assert.rejects(library.writeFile("seed", path, new Blob([])), {
      code: "path-invalid",
    })
})


test("保存 Skill 入口原子更新元信息，失败保留旧名称、说明与正文", async (t) => {
  const { library, create, setFailure } = await setup(t)
  const content = '---\nname: "Markdown 名称"\ndescription: "Markdown 说明"\n---\n\n# 原样保留\n'
  const skill = await library.writeFile("seed", "SKILL.md", new Blob([content]), { replace: true })
  assert.equal(skill.name, "Markdown 名称")
  assert.equal(skill.description, "Markdown 说明")
  assert.equal((await create().get("seed")).name, "Markdown 名称")
  assert.equal(await (await create().readFile("seed", "SKILL.md")).text(), content)
  setFailure(true)
  await assert.rejects(library.writeFile("seed", "SKILL.md", new Blob([content.replace("Markdown 名称", "未保存名称")]), { replace: true }))
  assert.equal((await library.get("seed")).name, "Markdown 名称")
  assert.equal(await (await library.readFile("seed", "SKILL.md")).text(), content)
  setFailure(false)
  await assert.rejects(library.writeFile("seed", "SKILL.md", new Blob(['---\nname: missing-description\n---\n']), { replace: true }), { code: "path-invalid" })
  assert.equal((await library.get("seed")).description, "Markdown 说明")
})


test("创建将草稿文件和空目录原子提交，非法条目与失败不留下半包", async (t) => {
  const { library, create, persistence, documents, setFailure } = await setup(t)
  const entries = [
    { path: "reference/notes.md", kind: "file", content: "完整草稿\n" },
    { path: "reference/empty", kind: "folder" },
    { path: "scripts", kind: "folder" },
  ]
  let saves = 0
  const save = persistence.save
  persistence.save = async (skill) => {
    saves++
    assert.equal(skill.entries.length, 5, "提交时必须已经包含全部文件和目录")
    await save(skill)
  }
  const created = await library.create({ name: "完整草稿", content: "入口", entries })
  assert.equal(saves, 1)
  assert.equal(await (await create().readFile(created.id, "reference/notes.md")).text(), "完整草稿\n")
  assert.ok((await create().get(created.id)).entries.some(entry => entry.path === "reference/empty" && entry.kind === "folder"))
  for (const invalid of [
    [{ path: "skill.md", kind: "file", content: "重复入口" }],
    [{ path: "docs", kind: "folder" }, { path: "DOCS", kind: "folder" }],
    [{ path: "docs", kind: "file", content: "文件" }, { path: "docs/a.md", kind: "file", content: "嵌套" }],
    [{ path: "Docs/a.md", kind: "file", content: "文件" }, { path: "docs/b.md", kind: "file", content: "大小写冲突" }],
    [{ path: "../outside", kind: "folder" }],
    [{ path: "docs", kind: "folder", content: "意外内容" }],
    [{ path: "docs/a.md", kind: "file", content: {} }],
    [{ path: "docs", kind: "other" }],
    null,
  ]) await assert.rejects(library.create({ name: "非法草稿", entries: invalid }))
  assert.equal(saves, 1, "所有条目校验均须先于持久化")
  setFailure(true)
  await assert.rejects(library.create({ name: "存储失败", content: "入口", entries }), { code: "storage" })
  assert.equal(documents.size, 1)
  assert.deepEqual((await create().list()).filter(skill => skill.id.startsWith("created-")).map(skill => skill.id), [created.id])
})
