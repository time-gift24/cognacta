import {
  createSkillLibrary,
  SkillLibraryError,
  type SkillLibrary,
  type SkillLibraryPersistence,
  type StoredSkill,
} from "../skills/library.ts"
import type { SkillDraftCache } from "../skills/drafts.ts"
import type { SkillSource } from "../skills/source.ts"

/** IndexedDB stores actual Blob bytes, not browser-session object URLs.
 * Construction is side-effect free; each operation owns and closes its connection.
 */
export function createBrowserSkillLibrary(
  backendId: string,
  source: SkillSource,
  legacyDrafts: SkillDraftCache,
  {
    getIndexedDB = () => globalThis.indexedDB,
  }: { getIndexedDB?: () => IDBFactory } = {}
): SkillLibrary {
  if (!backendId.trim()) throw new Error("backendId must not be empty")
  const databaseName = `omnimind-ops:skills:${encodeURIComponent(backendId)}`
  const connect = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const factory = getIndexedDB()
      if (!factory) {
        reject(
          new SkillLibraryError(
            "storage",
            "此浏览器无法使用本地文件存储，请使用支持 IndexedDB 的浏览器或桌面客户端。"
          )
        )
        return
      }
      const request = factory.open(databaseName, 1)
      request.onupgradeneeded = () =>
        request.result.createObjectStore("packages", { keyPath: "id" })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(request.error ?? new Error("无法打开 Skill 存储"))
      request.onblocked = () =>
        reject(
          new SkillLibraryError(
            "storage",
            "Skill 存储被其他页面占用，请关闭旧页面后重试。"
          )
        )
    })
  const transact = async <T>(
    mode: IDBTransactionMode,
    perform: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> => {
    const database = await connect()
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = database.transaction("packages", mode)
        const request = perform(transaction.objectStore("packages"))
        transaction.oncomplete = () => resolve(request.result)
        transaction.onabort = () =>
          reject(
            transaction.error ?? request.error ?? new Error("Skill 保存已中止")
          )
        transaction.onerror = () =>
          reject(
            transaction.error ??
              request.error ??
              new Error("Skill 存储操作失败")
          )
      })
    } finally {
      database.close()
    }
  }
  const persistence: SkillLibraryPersistence = {
    load: () => transact<StoredSkill[]>("readonly", (store) => store.getAll()),
    async save(skill) {
      await transact("readwrite", (store) => store.put(skill))
    },
    async remove(id) {
      await transact("readwrite", (store) => store.delete(id))
    },
  }
  return createSkillLibrary({
    source,
    legacyDrafts,
    persistence,
    storage: { kind: "browser", root: "当前浏览器 · IndexedDB" },
  })
}
