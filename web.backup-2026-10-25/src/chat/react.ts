import * as React from "react"

import type { ThreadId } from "./dto.ts"
import type { ThreadViewState } from "./fold.ts"
import type { ThreadStoreRegistry } from "./registry.ts"
import type { ThreadStore } from "./thread-store.ts"

/** 卸载只释放引用，不中止流。 */
export function useThreadStore(
  threadId: ThreadId,
  registry: ThreadStoreRegistry
): ThreadStore {
  const [, checkStore] = React.useReducer((revision: number) => revision + 1, 0)
  const store = registry.get(threadId)
  React.useLayoutEffect(() => {
    const retained = registry.acquire(threadId, store)
    // Another consumer may have replaced an evicted entry between render and commit.
    if (retained !== store) checkStore()
    return () => registry.release(threadId)
  }, [registry, threadId, store])
  return store
}

export function useThreadState(store: ThreadStore): ThreadViewState {
  return React.useSyncExternalStore(store.subscribe, store.getState)
}
