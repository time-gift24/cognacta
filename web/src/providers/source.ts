export interface ProviderEntry {
  name: string
  baseURL: string
  models: readonly string[]
  hasKey: boolean
}

export interface ProviderModel {
  provider: string
  model: string
}

export interface ProviderCatalog {
  providers: readonly ProviderEntry[]
  defaultModel: ProviderModel | null
}

export interface ProviderInput {
  originalName?: string
  name: string
  baseURL: string
  models: readonly string[]
  /** undefined preserves the current key; null/empty clears it. Never returned. */
  apiKey?: string | null
}

/**
 * Scoped to one application/backend. All writes return the committed catalog;
 * rejection leaves the previous configuration and caller's draft intact.
 * test requires a saved model; AbortSignal ends local waiting and releases its
 * listener. It never reads chat state or automatically retries a request.
 * Entries only disclose key presence. No operation reads back a key value.
 * @example
 * await source.save({name: "本地", baseURL: "http://localhost:8000/v1", models: ["local"]})
 * await source.setDefault({provider: "本地", model: "local"})
 * await source.test({provider: "本地", model: "local"}, controller.signal)
 */
export interface ProviderSource {
  readonly simulated: boolean
  load(): Promise<ProviderCatalog>
  save(input: ProviderInput): Promise<ProviderCatalog>
  remove(name: string): Promise<ProviderCatalog>
  setDefault(selection: ProviderModel): Promise<ProviderCatalog>
  test(selection: ProviderModel, signal: AbortSignal): Promise<void>
}

export function providerModelId(selection: ProviderModel): string {
  return JSON.stringify([selection.provider, selection.model])
}

/** A removed fixed choice still has a readable label, never another selection. */
export function providerModelLabel(id: string): string {
  try {
    const value: unknown = JSON.parse(id)
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      value.every((v) => typeof v === "string")
    )
      return `${value[0]} / ${value[1]}`
  } catch {
    /* Legacy model IDs are already displayable. */
  }
  return id
}

/** Shared boundary validation; the backend validates again before persistence. */
export function validateProviderInput(input: ProviderInput): ProviderInput {
  const controls = (value: string) =>
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  const name = input.name.trim()
  if (!name || name.length > 64 || controls(input.name))
    throw new Error("Provider 名称须为 1–64 个字符，不能包含控制字符。")
  let url: URL
  try {
    url = new URL(input.baseURL.trim())
  } catch {
    throw new Error("请输入有效的 HTTP／HTTPS 接入地址。")
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    input.baseURL.length > 2048 ||
    controls(input.baseURL)
  )
    throw new Error(
      "接入地址须为 HTTP／HTTPS，不能包含账号、密码、查询参数或片段。"
    )
  const models = input.models.map((model) => model.trim())
  if (
    models.length > 100 ||
    input.models.some(controls) ||
    models.some(
      (model) =>
        !model ||
        model.length > 128 ||
        controls(model) ||
        providerModelId({ provider: name, model }).length > 256
    )
  )
    throw new Error("最多可配置 100 个模型，每个名称须为 1–128 个字符。")
  if (new Set(models).size !== models.length)
    throw new Error("同一 Provider 的模型名称不能重复。")
  if (
    input.apiKey !== undefined &&
    input.apiKey !== null &&
    (new TextEncoder().encode(input.apiKey).length > 2560 ||
      controls(input.apiKey))
  )
    throw new Error("API Key 格式无效。")
  return { ...input, name, baseURL: url.href.replace(/\/$/, ""), models }
}
