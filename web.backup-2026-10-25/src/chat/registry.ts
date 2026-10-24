import type { ChatGateway } from "./gateway.ts";
import type { ThreadId } from "./dto.ts";
import { ThreadStoreImpl, type ThreadSnapshot, type ThreadStore } from "./thread-store.ts";

export interface ThreadStoreRegistry {
  /** 获取或创建缓存项，不持有挂载引用；供渲染阶段读取。 */
  get(threadId: ThreadId): ThreadStore;
  /** 引用计数 +1；渲染后已驱逐时保留 renderedStore 的同一实例。 */
  acquire(threadId: ThreadId, renderedStore?: ThreadStore): ThreadStore;
  /** 引用计数 -1，归零后进入可驱逐状态；不中止流。 */
  release(threadId: ThreadId): void;
  snapshot(threadId: ThreadId): ThreadSnapshot | undefined;
  /** LRU 驱逐空闲线程；跳过有订阅者和流式中的线程。 */
  evictIdle(maxIdle?: number): void;
}

interface Entry {
  store: ThreadStore;
  refs: number;
  lastUsed: number;
}

export function createThreadStoreRegistry(
  gatewayFor: (threadId: ThreadId) => ChatGateway,
): ThreadStoreRegistry {
  const entries = new Map<ThreadId, Entry>();
  let lastUsed = 0;

  const touch = (entry: Entry) => {
    entry.lastUsed = ++lastUsed;
  };

  const getEntry = (threadId: ThreadId, renderedStore?: ThreadStore): Entry => {
    let entry = entries.get(threadId);
    if (!entry) {
      entry = {
        store: renderedStore ?? new ThreadStoreImpl(threadId, gatewayFor(threadId)),
        refs: 0,
        lastUsed: ++lastUsed,
      };
      entries.set(threadId, entry);
    }
    return entry;
  };

  return {
    get(threadId) {
      return getEntry(threadId).store;
    },
    acquire(threadId, renderedStore) {
      const entry = getEntry(threadId, renderedStore);
      entry.refs += 1;
      touch(entry);
      return entry.store;
    },

    release(threadId) {
      const entry = entries.get(threadId);
      if (!entry) return;
      entry.refs = Math.max(0, entry.refs - 1);
      touch(entry);
    },

    snapshot(threadId) {
      return entries.get(threadId)?.store.snapshot();
    },

    evictIdle(maxIdle = 0) {
      if (!Number.isInteger(maxIdle) || maxIdle < 0) {
        throw new RangeError("maxIdle 必须是非负整数");
      }
      const idle = [...entries.entries()]
        .filter(
          ([, entry]) =>
            entry.refs === 0 &&
            entry.store.listenerCount === 0 &&
            !entry.store.streaming,
        )
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      const excess = idle.length - maxIdle;
      for (let i = 0; i < excess; i += 1) {
        entries.delete(idle[i][0]);
      }
    },
  };
}
