import { useEffect, useState } from "react"

export type BackendDataState<T> =
  { status: "loading" } | { status: "error" } | { status: "ready"; data: T }

/**
 * 按 key 从 WorkbenchBackend 加载数据。
 * key 变化时重置为 loading 并重新加载；卸载后到达的结果被丢弃。
 */
export function useBackendData<T>(
  key: unknown,
  load: () => Promise<T>,
  source?: unknown
): BackendDataState<T> {
  type KeyedState = BackendDataState<T> & { key: unknown; source: unknown }
  const [state, setState] = useState<KeyedState>({
    key,
    source,
    status: "loading",
  })
  // React 认可的派生重置：渲染期比较 key，避免在 effect 里同步 setState。
  if (state.key !== key || state.source !== source)
    setState({ key, source, status: "loading" })
  useEffect(() => {
    let live = true
    Promise.resolve()
      .then(load)
      .then(
        (data) => {
          if (live) setState({ key, source, status: "ready", data })
        },
        () => {
          if (live) setState({ key, source, status: "error" })
        }
      )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key covers query inputs; source covers adapter identity.
  }, [key, source])
  return state
}
