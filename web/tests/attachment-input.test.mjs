import assert from "node:assert/strict"
import { test } from "node:test"
import { createServer } from "vite"

test("附件引用到达网关且重试保留文件，消息视图与快照只含展示元数据", async (t) => {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  t.after(() => server.close())
  const { ThreadStoreImpl } = await server.ssrLoadModule(
    "/src/chat/thread-store.ts"
  )
  const requests = []
  const store = new ThreadStoreImpl("attachment-input", {
    abort() {},
    async *stream(request) {
      requests.push(request)
      yield { type: "failed", error: { kind: "transport", message: "retry" } }
    },
  })
  const file = new File(["original file contents"], "notes.txt", {
    type: "text/plain",
  })
  const attachment = {
    id: "selected-file",
    name: file.name,
    mediaType: file.type,
    size: file.size,
    file,
    url: "blob:preview-reference",
  }
  const settle = () =>
    new Promise((resolve) => {
      const unsubscribe = store.subscribe(() => {
        if (store.streaming) return
        unsubscribe()
        resolve()
      })
    })
  const first = settle()
  assert.equal(store.send("read this file", [attachment], "chosen-model"), true)
  await first
  const input = requests[0].messages[0].attachments[0]
  assert.equal(input.file, file)
  assert.equal(await input.file.text(), "original file contents")
  assert.equal(input.id, attachment.id)
  assert.equal(input.url, attachment.url)
  assert.equal(input.size, file.size)

  attachment.url = "changed-by-caller"
  const retry = settle()
  store.retry()
  await retry
  assert.equal(requests[1].messages[0].attachments[0].file, file)
  assert.equal(
    requests[1].messages[0].attachments[0].url,
    "blob:preview-reference"
  )
  assert.equal(requests[1].model, "chosen-model")
  const expected = [{ name: "notes.txt", mediaType: "text/plain" }]
  assert.deepEqual(store.getState().messages[0].attachments, expected)
  const snapshot = store.snapshot()
  assert.deepEqual(snapshot.state.messages[0].attachments, expected)
  assert.deepEqual(
    JSON.parse(JSON.stringify(snapshot)).state.messages[0].attachments,
    expected
  )
})
