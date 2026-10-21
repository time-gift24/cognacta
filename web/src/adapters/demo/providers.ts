import type { ModelSource } from "@/models/source"
import type { ChatGateway } from "@/chat/gateway"
import {
  providerModelId,
  validateProviderInput,
  type ProviderCatalog,
  type ProviderSource,
} from "@/providers/source"

/** In-memory demo only: never stores a key value or claims OS credentials. */
export function createDemoProviders(): {
  providers: ProviderSource
  models: ModelSource
  wrapGateway(gateway: ChatGateway): ChatGateway
} {
  let catalog: ProviderCatalog = {
    providers: [
      {
        name: "演示接入",
        baseURL: "https://demo.example/v1",
        models: ["pine-1", "sonnet-5", "opus-4.8", "gpt-5.6"],
        hasKey: false,
      },
    ],
    defaultModel: { provider: "演示接入", model: "pine-1" },
  }
  const listeners = new Set<() => void>()
  let revision = 1
  const revisions = new Map(
    catalog.providers.map((entry) => [entry.name, revision])
  )
  const read = () => structuredClone(catalog)
  const commit = (next: ProviderCatalog) => {
    catalog = structuredClone(next)
    for (const listener of [...listeners]) listener()
    return read()
  }
  const validDefault = (next: ProviderCatalog): ProviderCatalog => ({
    ...next,
    defaultModel:
      next.defaultModel &&
      next.providers.some(
        (entry) =>
          entry.name === next.defaultModel?.provider &&
          entry.models.includes(next.defaultModel.model)
      )
        ? next.defaultModel
        : null,
  })
  const providers: ProviderSource = {
    simulated: true,
    async load() {
      return read()
    },
    async save(input) {
      const value = validateProviderInput(input)
      const previous = catalog.providers.find(
        (entry) => entry.name === input.originalName
      )
      if (input.originalName && !previous)
        throw new Error("找不到 Provider，请重新读取。")
      if (
        catalog.providers.some(
          (entry) => entry.name === value.name && entry !== previous
        )
      )
        throw new Error("Provider 名称已存在。")
      if (!previous && catalog.providers.length >= 32)
        throw new Error("最多可配置 32 个 Provider。")
      const entry = {
        name: value.name,
        baseURL: value.baseURL,
        models: [...value.models],
        hasKey:
          value.apiKey === undefined
            ? (previous?.hasKey ?? false)
            : Boolean(value.apiKey?.trim()),
      }
      const next = catalog.providers.map((item) =>
        item === previous ? entry : item
      )
      if (!previous) next.push(entry)
      if (input.originalName) revisions.delete(input.originalName)
      revisions.set(value.name, ++revision)
      return commit(
        validDefault({
          providers: next,
          defaultModel:
            catalog.defaultModel &&
            catalog.defaultModel.provider === input.originalName
              ? { ...catalog.defaultModel, provider: value.name }
              : catalog.defaultModel,
        })
      )
    },
    async remove(name) {
      if (!catalog.providers.some((entry) => entry.name === name))
        throw new Error("找不到 Provider。")
      revisions.delete(name)
      return commit(
        validDefault({
          ...catalog,
          providers: catalog.providers.filter((entry) => entry.name !== name),
        })
      )
    },
    async setDefault(selection) {
      if (
        !catalog.providers.some(
          (entry) =>
            entry.name === selection.provider &&
            entry.models.includes(selection.model)
        )
      )
        throw new Error("请选择已保存的模型。")
      return commit({ ...catalog, defaultModel: selection })
    },
    async test(selection, signal) {
      if (
        !catalog.providers.some(
          (entry) =>
            entry.name === selection.provider &&
            entry.models.includes(selection.model)
        )
      )
        throw new Error("请选择已保存的模型。")
      if (signal.aborted) throw new DOMException("已取消", "AbortError")
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer)
          signal.removeEventListener("abort", abort)
          reject(new DOMException("已取消", "AbortError"))
        }
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", abort)
          resolve()
        }, 300)
        signal.addEventListener("abort", abort, { once: true })
      })
    },
  }
  return {
    providers,
    wrapGateway(gateway) {
      let pinned: { id: string; revision: number } | undefined
      return {
        abort: () => gateway.abort(),
        async *stream(request) {
          const selectedId =
            request.model ??
            (catalog.defaultModel && providerModelId(catalog.defaultModel))
          const selection = catalog.providers
            .flatMap((entry) =>
              entry.models.map((model) => ({
                entry,
                model,
                id: providerModelId({ provider: entry.name, model }),
              }))
            )
            .find((choice) => choice.id === selectedId)
          if (
            !selection ||
            (pinned &&
              (pinned.id !== selectedId ||
                pinned.revision !== revisions.get(selection.entry.name)))
          ) {
            yield {
              type: "failed",
              error: {
                kind: "unavailable",
                message:
                  "所选 Provider 配置已不可用，请检查设置；本会话不会自动切换模型。",
              },
            }
            return
          }
          pinned ??= {
            id: selection.id,
            revision: revisions.get(selection.entry.name)!,
          }
          for await (const event of gateway.stream({
            ...request,
            model: selection.model,
          })) {
            const metadata = {
              providerName: selection.entry.name,
              protocolName: "mock.streaming",
              requestedModel: selection.model,
              resolvedModel: selection.model,
            }
            if (event.type === "started")
              yield { ...event, metadata: { ...event.metadata, ...metadata } }
            else if (event.type === "completed")
              yield {
                ...event,
                response: {
                  ...event.response,
                  metadata: { ...event.response.metadata, ...metadata },
                },
              }
            else yield event
          }
        },
      }
    },
    models: {
      async list() {
        return catalog.providers.flatMap((entry) =>
          entry.models.map((model) => ({
            id: providerModelId({ provider: entry.name, model }),
            label: `${entry.name} / ${model}`,
            isDefault:
              catalog.defaultModel?.provider === entry.name &&
              catalog.defaultModel.model === model,
          }))
        )
      },
      subscribe(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
  }
}
