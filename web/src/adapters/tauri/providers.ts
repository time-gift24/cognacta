import type { ModelSource } from "@/models/source"
import {
  validateProviderInput,
  type ProviderCatalog,
  type ProviderEntry,
  type ProviderModel,
  type ProviderSource,
} from "@/providers/source"
import { array, boolean, object, string } from "./protocol"

const messages: Record<string, string> = {
  "invalid-request": "配置无效，请检查名称、地址和模型。",
  "credential-unavailable":
    "系统凭据不可用，请解锁凭据库或替换 API Key 后重试。",
  credentials: "系统凭据不可用，请解锁凭据库或替换 API Key 后重试。",
  storage: "本地配置保存失败，原有效配置保持不变，请重试。",
  unavailable: "所选接入或模型已不可用，请检查 Provider 配置。",
  authentication: "鉴权失败，请检查 API Key。",
  "model-unavailable": "模型不可用，请检查模型名称与访问权限。",
  "rate-limited": "服务请求过于频繁，请稍后重试。",
  timeout: "连接测试超时，请检查地址或稍后重试。",
  transport: "无法连接模型服务，请检查网络、地址与证书。",
  connection: "无法连接模型服务，请检查网络、地址与证书。",
  upstream: "模型服务拒绝了请求，请检查接入配置。",
  "upstream-rejected": "模型服务拒绝了请求，请检查接入配置。",
  truncated: "模型响应未完整结束，请重试。",
  "incomplete-response": "模型响应未完整结束，请重试。",
  "invalid-response": "模型服务返回了无效响应。",
  aborted: "已结束本地等待。",
}
function safeFailure(error: unknown, fallback: string): Error {
  if (error instanceof DOMException && error.name === "AbortError") return error
  let current: unknown = error
  for (
    let depth = 0;
    depth < 4 && current && typeof current === "object";
    depth++
  ) {
    if (
      "kind" in current &&
      typeof current.kind === "string" &&
      messages[current.kind]
    )
      return new Error(messages[current.kind], { cause: error })
    current = "cause" in current ? current.cause : undefined
  }
  return new Error(fallback, { cause: error })
}

export function readProviderCatalog(value: unknown): ProviderCatalog {
  const raw = object(value)
  const providers = array(raw.providers, (value): ProviderEntry => {
    const entry = object(value)
    const input = validateProviderInput({
      name: string(entry.name),
      baseURL: string(entry.baseURL),
      models: array(entry.models, string),
    })
    return {
      name: input.name,
      baseURL: input.baseURL,
      models: input.models,
      hasKey: boolean(entry.hasKey),
    }
  })
  if (
    providers.length > 32 ||
    new Set(providers.map((entry) => entry.name)).size !== providers.length
  )
    throw new Error("Provider 目录包含重复名称。")
  let defaultModel: ProviderModel | null = null
  if (raw.defaultModel !== null) {
    const selection = object(raw.defaultModel)
    defaultModel = {
      provider: string(selection.provider),
      model: string(selection.model),
    }
    if (
      !providers.some(
        (entry) =>
          entry.name === defaultModel?.provider &&
          entry.models.includes(defaultModel.model)
      )
    )
      throw new Error("默认模型不在 Provider 目录中。")
  }
  return { providers, defaultModel }
}

/** Construct without IPC; requests begin only from explicit source methods. */
export function createTauriProviders(
  request: (
    method: string,
    params?: Record<string, unknown>
  ) => Promise<unknown>
): { providers: ProviderSource; models: ModelSource } {
  const listeners = new Set<() => void>()
  const catalog = async (
    method: string,
    params?: Record<string, unknown>,
    write = false
  ) => {
    try {
      const result = readProviderCatalog(await request(method, params))
      if (write) for (const listener of [...listeners]) listener()
      return result
    } catch (error) {
      throw safeFailure(
        error,
        write
          ? "Provider 保存失败，原配置仍生效，请重试。"
          : "Provider 目录读取失败，请重试。"
      )
    }
  }
  const providers: ProviderSource = {
    simulated: false,
    load: () => catalog("providers_get"),
    save: async (input) =>
      catalog("provider_save", { ...validateProviderInput(input) }, true),
    remove: (name) => catalog("provider_remove", { name }, true),
    setDefault: (selection) =>
      catalog("provider_default", { ...selection }, true),
    async test(selection, signal) {
      if (signal.aborted) throw new DOMException("已取消", "AbortError")
      const testId = crypto.randomUUID()
      let abort: (() => void) | undefined
      const aborted = new Promise<never>((_resolve, reject) => {
        abort = () => {
          void request("provider_test_cancel", { testId }).catch(() => {})
          reject(new DOMException("已取消", "AbortError"))
        }
        signal.addEventListener("abort", abort, { once: true })
      })
      try {
        const result = object(
          await Promise.race([
            request("provider_test", { testId, ...selection }),
            aborted,
          ])
        )
        if (signal.aborted) throw new DOMException("已取消", "AbortError")
        if (result.tested !== true) throw new Error("invalid test result")
      } catch (error) {
        throw safeFailure(error, "连接测试失败，请检查接入配置后重试。")
      } finally {
        if (abort) signal.removeEventListener("abort", abort)
      }
    },
  }
  return {
    providers,
    models: {
      async list() {
        return array(await request("models_list"), (entry) => {
          const raw = object(entry)
          return {
            id: string(raw.id),
            label: string(raw.label),
            ...(raw.isDefault === undefined
              ? {}
              : { isDefault: boolean(raw.isDefault) }),
          }
        })
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
