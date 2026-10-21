import { useEffect, useId, useRef, useState } from "react"
import { useAppDependencies } from "@/app/dependencies"
import { Button } from "@/components/motion/button"
import { Input } from "@/components/motion/input"
import { Select } from "@/components/premium/select/select"
import { useToast } from "@/components/ui/toast"
import { useBackendData } from "@/components/workbench/use-backend-data"
import {
  validateProviderInput,
  type ProviderCatalog,
  type ProviderEntry,
  type ProviderInput,
  type ProviderSource,
} from "@/providers/source"

type Draft = {
  originalName?: string
  name: string
  baseURL: string
  models: string[]
  keyMode: "keep" | "replace" | "clear"
  key: string
}
const draftFor = (entry?: ProviderEntry): Draft => ({
  originalName: entry?.name,
  name: entry?.name ?? "",
  baseURL: entry?.baseURL ?? "",
  models: entry ? [...entry.models] : [""],
  keyMode: "keep",
  key: "",
})
const failure = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export function ProviderSettings() {
  const { providers } = useAppDependencies()
  const [attempt, setAttempt] = useState(0)
  const loaded = useBackendData(
    attempt,
    async () => {
      if (!providers) throw new Error("unsupported")
      return providers.load()
    },
    providers
  )
  return (
    <section
      id="client-settings-providers"
      data-settings-section="providers"
      data-slot="provider-settings"
      tabIndex={-1}
      aria-labelledby="settings-providers-heading"
      className="settings-section border-t border-border py-10"
    >
      <h2 id="settings-providers-heading" className="text-lg font-medium">
        Provider
      </h2>
      {!providers ? (
        <p className="mt-5 text-sm text-muted-foreground">
          当前接入暂不支持 Provider 管理。
        </p>
      ) : loaded.status === "loading" ? (
        <p role="status" className="mt-5 text-sm text-muted-foreground">
          正在读取 Provider…
        </p>
      ) : loaded.status === "error" ? (
        <div className="mt-5 space-y-3">
          <p role="alert" className="text-sm text-destructive">
            Provider 读取失败，请重试。
          </p>
          <Button
            variant="outline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            重新读取 Provider
          </Button>
        </div>
      ) : (
        <ProviderManager
          key={attempt}
          source={providers}
          initial={loaded.data}
        />
      )}
    </section>
  )
}

function ProviderManager({
  source,
  initial,
}: {
  source: ProviderSource
  initial: ProviderCatalog
}) {
  const { host } = useAppDependencies()
  const toast = useToast()
  const id = useId()
  const [catalog, setCatalog] = useState(initial)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [testModel, setTestModel] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const operation = useRef(false)
  const live = useRef(false)
  const test = useRef<AbortController | null>(null)
  const showError = (message: string) => {
    toast.dismissKey("provider-notice")
    toast.notify({ key: "provider-error", title: message, tone: "error" })
  }
  const showNotice = (message: string) => {
    toast.dismissKey("provider-error")
    toast.notify({ key: "provider-notice", title: message, tone: "success" })
  }
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      test.current?.abort()
    }
  }, [])
  const saved = catalog.providers.find(
    (entry) => entry.name === draft?.originalName
  )
  const dirty =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(draftFor(saved))
  const stopTest = () => {
    test.current?.abort()
    test.current = null
    setTesting(false)
    setTestResult(null)
  }
  function edit(entry?: ProviderEntry) {
    stopTest()
    setDraft(draftFor(entry))
    setTestModel("")
    toast.dismissKey("provider-error")
    toast.dismissKey("provider-notice")
  }
  function update(patch: Partial<Draft>) {
    stopTest()
    setDraft((value) => value && { ...value, ...patch })
    toast.dismissKey("provider-error")
    toast.dismissKey("provider-notice")
  }
  async function write(
    action: () => Promise<ProviderCatalog>,
    success: (result: ProviderCatalog) => void
  ) {
    if (operation.current) return
    operation.current = true
    setBusy(true)
    toast.dismissKey("provider-error")
    toast.dismissKey("provider-notice")
    stopTest()
    try {
      const next = await action()
      if (!live.current) return
      setCatalog(next)
      success(next)
    } catch (cause) {
      if (live.current) showError(failure(cause, "Provider 操作失败，请重试。"))
    } finally {
      operation.current = false
      if (live.current) setBusy(false)
    }
  }
  const defaultLabel = catalog.defaultModel
    ? `${catalog.defaultModel.provider} / ${catalog.defaultModel.model}`
    : "未设置"
  return (
    <div className="mt-5 space-y-6">
      {source.simulated ? (
        <p className="text-sm text-muted-foreground">
          网页演示：配置仅保留在本次页面，凭据状态与连接测试为模拟。
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm break-words">
          <span className="text-muted-foreground">全局默认模型：</span>
          {defaultLabel}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || Boolean(draft)}
          onClick={() => edit()}
        >
          添加 Provider
        </Button>
      </div>
      {!catalog.providers.length ? (
        <p className="py-5 text-sm text-muted-foreground">
          尚未配置 Provider。
        </p>
      ) : (
        <ul
          className="divide-y divide-border border-y border-border"
          aria-label="Provider 列表"
        >
          {catalog.providers.map((entry) => (
            <li key={entry.name}>
              <button
                type="button"
                disabled={busy || dirty}
                aria-pressed={draft?.originalName === entry.name}
                onClick={() => edit(entry)}
                className="flex w-full min-w-0 items-center justify-between gap-4 rounded-lg px-2 py-4 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed aria-pressed:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {entry.name}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {entry.baseURL}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <span className="block">
                    {entry.hasKey ? "API Key 已配置" : "API Key 未配置"}
                  </span>
                  <span className="mt-1 block">
                    {entry.models.length} 个模型
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {draft ? (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (busy) return
            let input: ProviderInput
            try {
              input = validateProviderInput({
                originalName: draft.originalName,
                name: draft.name,
                baseURL: draft.baseURL,
                models: draft.models,
                ...(draft.keyMode === "replace"
                  ? { apiKey: draft.key }
                  : draft.keyMode === "clear"
                    ? { apiKey: null }
                    : {}),
              })
              if (draft.keyMode === "replace" && !draft.key.trim())
                throw new Error("请输入新的 API Key，或选择清除。")
              if (
                catalog.providers.some(
                  (entry) =>
                    entry.name === input.name &&
                    entry.name !== draft.originalName
                )
              )
                throw new Error("Provider 名称已存在。")
            } catch (cause) {
              showError(failure(cause, "配置无效。"))
              return
            }
            void write(
              () => source.save(input),
              (next) => {
                const entry = next.providers.find(
                  (entry) => entry.name === input.name
                )
                setDraft(entry ? draftFor(entry) : null)
                setTestModel("")
                showNotice("Provider 已保存。")
              }
            )
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">
              {saved ? `编辑 ${saved.name}` : "新增 Provider"}
            </h3>
            <span className="text-xs text-muted-foreground">
              OpenAI 兼容接口
            </span>
          </div>
          <div className="grid min-w-0 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor={`${id}-name`} className="text-sm font-medium">
                名称
              </label>
              <Input
                id={`${id}-name`}
                maxLength={64}
                value={draft.name}
                disabled={busy}
                onChange={(name) => update({ name })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-url`} className="text-sm font-medium">
                接入地址
              </label>
              <Input
                id={`${id}-url`}
                type="url"
                maxLength={2048}
                placeholder="https://gateway.example/v1"
                value={draft.baseURL}
                disabled={busy}
                onChange={(baseURL) => update({ baseURL })}
              />
            </div>
          </div>
          <fieldset className="space-y-3" disabled={busy}>
            <legend className="mb-2 text-sm font-medium">模型</legend>
            {draft.models.map((model, index) => (
              <div className="flex min-w-0 items-center gap-2" key={index}>
                <label className="sr-only" htmlFor={`${id}-model-${index}`}>
                  模型 {index + 1}
                </label>
                <Input
                  id={`${id}-model-${index}`}
                  maxLength={128}
                  value={model}
                  className="min-w-0 flex-1"
                  placeholder="上游实际 model 名称"
                  onChange={(value) =>
                    update({
                      models: draft.models.map((entry, i) =>
                        i === index ? value : entry
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`移除模型 ${index + 1}`}
                  onClick={() =>
                    update({
                      models: draft.models.filter((_entry, i) => i !== index),
                    })
                  }
                >
                  移除
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={draft.models.length >= 100}
              onClick={() => update({ models: [...draft.models, ""] })}
            >
              添加模型
            </Button>
          </fieldset>
          <fieldset disabled={busy} className="space-y-3">
            <legend className="mb-2 text-sm font-medium">
              API Key{" "}
              <span className="ml-2 font-normal text-muted-foreground">
                {saved?.hasKey ? "已配置" : "未配置"}
              </span>
            </legend>
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
              {(
                [
                  ["keep", saved?.hasKey ? "保留现有密钥" : "不配置密钥"],
                  ["replace", "替换密钥"],
                  ["clear", "清除密钥"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex min-h-8 items-center gap-2">
                  <input
                    type="radio"
                    name={`${id}-key-mode`}
                    value={value}
                    checked={draft.keyMode === value}
                    onChange={() => update({ keyMode: value, key: "" })}
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
            {draft.keyMode === "replace" ? (
              <div className="space-y-2">
                <label htmlFor={`${id}-key`} className="text-sm">
                  新的 API Key
                </label>
                <Input
                  id={`${id}-key`}
                  type="password"
                  autoComplete="new-password"
                  value={draft.key}
                  onChange={(key) => update({ key })}
                />
              </div>
            ) : null}
          </fieldset>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {saved ? (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="mr-auto text-destructive"
                onClick={() => {
                  if (operation.current) return
                  void host
                    .confirm(
                      `删除 Provider「${saved.name}」？使用它的会话将无法继续调用。`
                    )
                    .then(
                      (confirmed) => {
                        if (!confirmed || !live.current) return
                        void write(
                          () => source.remove(saved.name),
                          () => {
                            setDraft(null)
                            showNotice("Provider 已删除。")
                          }
                        )
                      },
                      () => {
                        if (live.current) showError("无法确认删除，请重试。")
                      }
                    )
                }}
              >
                删除 Provider
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                stopTest()
                setDraft(null)
                toast.dismissKey("provider-error")
                toast.dismissKey("provider-notice")
              }}
            >
              关闭编辑
            </Button>
            <Button type="submit" disabled={busy || (!dirty && Boolean(saved))}>
              {busy ? "正在保存…" : "保存 Provider"}
            </Button>
          </div>
          {saved ? (
            <div className="space-y-3 border-t border-border pt-5">
              <label
                id={`${id}-test-label`}
                className="block text-sm font-medium"
              >
                已保存模型
              </label>
              <div className="flex flex-wrap gap-2">
                <Select
                  label="已保存模型"
                  value={testModel}
                  options={saved.models.map((model) => ({
                    id: model,
                    label: model,
                  }))}
                  placeholder={
                    saved.models.length ? "选择模型" : "尚未配置模型"
                  }
                  disabled={busy || dirty || testing || !saved.models.length}
                  portal
                  className="w-full min-w-0 sm:w-auto sm:min-w-48"
                  onValueChange={(model) => {
                    stopTest()
                    setTestModel(model)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    busy ||
                    dirty ||
                    !testModel ||
                    testing ||
                    (catalog.defaultModel?.provider === saved.name &&
                      catalog.defaultModel.model === testModel)
                  }
                  onClick={() =>
                    void write(
                      () =>
                        source.setDefault({
                          provider: saved.name,
                          model: testModel,
                        }),
                      () => showNotice("全局默认模型已更新。")
                    )
                  }
                >
                  设为默认
                </Button>
                {testing ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      test.current?.abort()
                      test.current = null
                      setTesting(false)
                      setTestResult({
                        success: false,
                        message: `${saved.name} / ${testModel}：已结束本地等待。`,
                      })
                    }}
                  >
                    结束等待
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || dirty || !testModel}
                    onClick={() => {
                      if (test.current || !testModel) return
                      const controller = new AbortController(),
                        label = `${saved.name} / ${testModel}`
                      test.current = controller
                      setTesting(true)
                      setTestResult(null)
                      void source
                        .test(
                          { provider: saved.name, model: testModel },
                          controller.signal
                        )
                        .then(
                          () => {
                            if (live.current && test.current === controller)
                              setTestResult({
                                success: true,
                                message: `${label}：${source.simulated ? "模拟测试成功" : "连接测试成功"}。`,
                              })
                          },
                          (cause: unknown) => {
                            if (live.current && test.current === controller)
                              setTestResult({
                                success: false,
                                message: `${label}：${failure(cause, "连接测试失败，请重试。")}`,
                              })
                          }
                        )
                        .finally(() => {
                          if (live.current && test.current === controller) {
                            test.current = null
                            setTesting(false)
                          }
                        })
                    }}
                  >
                    测试连接
                  </Button>
                )}
              </div>
              {dirty ? (
                <p className="text-xs text-muted-foreground">
                  有未保存的修改，保存后可设置默认模型和测试连接。
                </p>
              ) : null}
              {testing ? (
                <p role="status" className="text-sm text-muted-foreground">
                  正在测试 {saved.name} / {testModel}…
                </p>
              ) : null}
              {testResult ? (
                <p
                  role={testResult.success ? "status" : "alert"}
                  className={`text-sm break-words ${testResult.success ? "text-muted-foreground" : "text-destructive"}`}
                >
                  {testResult.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}
