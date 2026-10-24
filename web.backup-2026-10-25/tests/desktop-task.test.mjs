import assert from "node:assert/strict"
import { test } from "node:test"
import { threadTask } from "../src/desktop/runtime.ts"

test("thread task lookup uses the complete task list and preserves the legacy singleton gate", () => {
  const selected = { runId: "run-a", threadId: "a", title: "Selected", phase: "stopping" }
  const own = { runId: "run-b", threadId: "b", title: "Own", phase: "running" }
  assert.equal(threadTask({ task: selected, tasks: [selected] }, "b"), null)
  assert.equal(threadTask({ task: selected, tasks: [selected, own] }, "b"), own)
  assert.equal(threadTask({ task: selected, tasks: [] }, "a"), null)
  assert.equal(threadTask({ task: selected }, "b"), selected)
  assert.equal(threadTask({ task: null }, "b"), null)
})
