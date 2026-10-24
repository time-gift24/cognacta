import assert from "node:assert/strict"
import { test } from "node:test"
import { createServer } from "vite"

const metadata = {
  providerName: "test",
  protocolName: "test",
  requestedModel: "test",
}

async function load(t) {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  t.after(() => server.close())
  return {
    ...(await server.ssrLoadModule("/src/chat/thread-store.ts")),
    ...(await server.ssrLoadModule("/src/chat/attachments.ts")),
  }
}

async function settled(store) {
  for (let i = 0; i < 200 && store.streaming; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
  assert.equal(store.streaming, false, "提交必须结束")
}

const attachmentOf = (file, id = "selected-file") => ({
  id,
  name: file.name,
  mediaType: file.type || "application/octet-stream",
  size: file.size,
  file,
})

test("附件预检在提交前拒绝 PDF 与超限文件，不创建回合也不清空输入", async (t) => {
  const { ThreadStoreImpl, validateAttachments } = await load(t)
  const requests = []
  const store = new ThreadStoreImpl("preflight", {
    abort() {},
    checkInput: ({ attachments }) => validateAttachments(attachments ?? []),
    async *stream(request) {
      requests.push(request)
      yield { type: "failed", error: { kind: "transport", message: "retry" } }
    },
  })
  store.updateDraft({ text: "保留这段文字", model: "chosen-model" })

  const pdf = new File(["%PDF-1.7"], "report.pdf", { type: "application/pdf" })
  assert.equal(store.send("保留这段文字", [attachmentOf(pdf)], "chosen-model"), false)
  assert.equal(store.getState().messages.length, 0)
  assert.match(store.getState().submitError.message, /暂不支持附件类型/)
  assert.equal(store.getDraft().text, "保留这段文字")
  assert.equal(store.getDraft().model, "chosen-model")
  assert.equal(requests.length, 0)

  const oversized = new File(
    [new Uint8Array(8 * 1024 * 1024 + 1)],
    "large.txt",
    { type: "text/plain" },
  )
  assert.equal(
    store.send("保留这段文字", [attachmentOf(oversized)], "chosen-model"),
    false,
  )
  assert.match(store.getState().submitError.message, /8 MiB/)
  assert.equal(store.getState().messages.length, 0)

  const text = new File(["ok"], "notes.txt", { type: "text/plain" })
  assert.equal(store.send("发送", [attachmentOf(text)], "chosen-model"), true)
  await settled(store)
  assert.equal(store.getState().submitError, undefined, "接受提交后清除预检错误")
  assert.equal(requests.length, 1)
})

test("生成开始前失败：移除占位回合并恢复文字、附件和模型", async (t) => {
  const { ThreadStoreImpl } = await load(t)
  const gate = Promise.withResolvers()
  const store = new ThreadStoreImpl("submit-restore", {
    abort() {},
    async *stream() {
      await gate.promise
      yield {
        type: "failed",
        stage: "submit",
        error: { kind: "invalid-request", message: "附件文件已不可用，请重新选择。" },
      }
    },
  })
  const file = new File(["original"], "notes.txt", { type: "text/plain" })
  const attachment = attachmentOf(file, "draft-file")

  assert.equal(store.send("原始问题", [attachment], "model-a"), true)
  assert.equal(store.getState().messages.length, 2)
  // 输入框在提交被接受后清空；随后失败到达。
  store.updateDraft({ text: "", attachments: [], model: "model-a" })
  gate.resolve()
  await settled(store)

  const state = store.getState()
  assert.equal(state.messages.length, 0, "未开始的提交不是回合")
  assert.equal(state.status, "idle")
  assert.equal(state.error, undefined)
  assert.equal(state.submitError?.message, "附件文件已不可用，请重新选择。")
  const draft = store.getDraft()
  assert.equal(draft.text, "原始问题")
  assert.equal(draft.model, "model-a")
  assert.equal(draft.attachments.length, 1)
  assert.equal(draft.attachments[0].file, file, "恢复的附件仍持有原始 File")
  assert.equal(store.snapshot().state.submitError, undefined, "提交错误不进入会话快照")
})

test("恢复失败原稿不覆盖失败后继续输入的文字", async (t) => {
  const { ThreadStoreImpl } = await load(t)
  const gate = Promise.withResolvers()
  const store = new ThreadStoreImpl("submit-race", {
    abort() {},
    async *stream() {
      await gate.promise
      yield {
        type: "failed",
        stage: "submit",
        error: { kind: "invalid-request", message: "每个附件不能超过 8 MiB。" },
      }
    },
  })
  const file = new File(["original"], "notes.txt", { type: "text/plain" })
  assert.equal(store.send("旧问题", [attachmentOf(file)], "model-a"), true)
  store.updateDraft({ text: "", attachments: [] })
  store.updateDraft({ text: "后来输入" })
  gate.resolve()
  await settled(store)

  const draft = store.getDraft()
  assert.equal(draft.text, "旧问题\n\n后来输入", "旧稿补在前面，后来输入保持原样")
  assert.equal(draft.model, "model-a")
  assert.equal(draft.attachments[0].file, file)
  assert.equal(store.getState().messages.length, 0)
})

test("生成开始后的失败保留回合，错误归属该条回复并可随快照恢复", async (t) => {
  const { ThreadStoreImpl } = await load(t)
  const store = new ThreadStoreImpl("run-failure", {
    abort() {},
    async *stream() {
      yield { type: "started", metadata }
      yield { type: "part-started", partId: 0, kind: "text" }
      yield { type: "delta", partId: 0, text: "partial" }
      yield {
        type: "failed",
        error: { kind: "transport", message: "连接中断，请重试。" },
      }
    },
  })
  assert.equal(store.send("问题"), true)
  await settled(store)

  const state = store.getState()
  assert.equal(state.messages.length, 2)
  assert.equal(state.submitError, undefined)
  const reply = state.messages.at(-1)
  assert.equal(reply.role, "assistant")
  assert.equal(reply.state, "failed")
  assert.equal(reply.error?.message, "连接中断，请重试。")
  assert.equal(state.error?.message, "连接中断，请重试。")
  assert.equal(
    store.snapshot().state.messages.at(-1).error?.message,
    "连接中断，请重试。",
    "回合错误属于消息历史",
  )
})
