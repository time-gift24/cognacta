import { useRef, useState } from "react"
import type { AgentSource, McpConfiguration, McpServer } from "@/agents/source"
import { Button } from "@/components/motion/button"
import { Input } from "@/components/motion/input"
import { useToast } from "@/components/ui/toast"

const empty = (): McpConfiguration => ({
  id: "",
  name: "",
  description: "",
  url: "",
  credentialEnv: "",
})
export function McpManager({
  source,
  servers,
  onChanged,
}: {
  source: AgentSource
  servers: readonly McpServer[]
  onChanged: () => Promise<void>
}) {
  const [form, setForm] = useState<McpConfiguration>(empty)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const lock = useRef(false)
  const clearNotices = () => {
    toast.dismissKey("mcp-error")
    toast.dismissKey("mcp-notice")
  }
  async function perform(operation: () => Promise<string>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    clearNotices()
    try {
      toast.notify({
        key: "mcp-notice",
        title: await operation(),
        tone: "success",
      })
    } catch (cause) {
      toast.notify({
        key: "mcp-error",
        title:
          cause instanceof Error ? cause.message : "MCP 操作失败，请重试。",
        tone: "error",
      })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  if (!source.saveMcp || !source.removeMcp || !source.testMcp) return null
  return (
    <details className="mt-6 border-t border-border pt-4">
      <summary className="cursor-pointer text-[13px] font-medium">
        管理本地 MCP 服务
      </summary>
      <p className="my-3 text-xs leading-5 text-muted-foreground">
        凭据只填写环境变量名称，应用不保存密钥。
      </p>
      <div className="space-y-3">
        {servers.map((server) => (
          <div
            key={server.id}
            className="space-y-2 rounded-lg border border-border p-3"
          >
            <p className="text-sm font-medium">{server.name}</p>
            <p className="text-xs break-all text-muted-foreground">
              {server.url || "尚未设置地址"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setForm({
                    id: server.id,
                    name: server.name,
                    description: server.description,
                    url: server.url ?? "",
                    credentialEnv: server.credentialEnv ?? "",
                  })
                  setEditing(true)
                  clearNotices()
                }}
              >
                配置
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    const result = await source.testMcp!(server.id)
                    await onChanged()
                    return `连接成功：${result.tools.length} 个工具、${result.resources.length} 个资源、${result.prompts.length} 个提示词。`
                  })
                }
              >
                测试连接
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await source.removeMcp!(server.id)
                    await onChanged()
                    return "已删除本地 MCP 配置。使用此服务的 Agent 需要重新选择能力。"
                  })
                }
              >
                删除
              </Button>
            </div>
          </div>
        ))}
      </div>
      {!editing ? (
        <Button
          className="mt-3"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            setForm(empty())
            setEditing(true)
          }}
        >
          添加 MCP 服务
        </Button>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void perform(async () => {
              await source.saveMcp!({
                ...form,
                id: form.id || `mcp-${crypto.randomUUID().slice(0, 8)}`,
                credentialEnv: form.credentialEnv?.trim() || undefined,
              })
              await onChanged()
              setEditing(false)
              return "MCP 配置已保存，请测试连接。"
            })
          }}
        >
          {(
            [
              {
                key: "name",
                label: "服务名称",
                placeholder: "团队知识库",
                required: true,
              },
              {
                key: "url",
                label: "服务地址",
                placeholder: "https://example.com/mcp",
                required: true,
              },
              {
                key: "description",
                label: "服务说明",
                placeholder: "提供的能力",
              },
              {
                key: "credentialEnv",
                label: "凭据环境变量名称",
                placeholder: "TEAM_MCP_TOKEN",
              },
            ] as const
          ).map((field) => (
            <Input
              key={field.key}
              label={field.label}
              value={form[field.key] ?? ""}
              placeholder={field.placeholder}
              required={"required" in field && field.required}
              disabled={busy}
              classNames={{
                label: "px-0 text-xs font-normal",
                field: "h-8",
                input: "px-2.5 text-sm",
              }}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  [field.key]: value,
                }))
              }
            />
          ))}
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} type="submit">
              保存服务
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              type="button"
              onClick={() => setEditing(false)}
            >
              取消
            </Button>
          </div>
        </form>
      )}
    </details>
  )
}
