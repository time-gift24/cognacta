import { useRef, useState } from "react"
import { Bot, Copy, Search, X } from "lucide-react"
import type { AgentEntry } from "@/agents/source"
import { Button } from "@/components/motion/button"
import { Input } from "@/components/motion/input"
import { cn } from "@/lib/utils"

export type AgentLibraryScreenProps = {
  agents: readonly AgentEntry[]
  busy: boolean
  canCreate: boolean
  onOpen: (id: string) => void
  onCopy?: (id: string) => void
}

export function AgentLibraryScreen({
  agents,
  busy,
  canCreate,
  onOpen,
  onCopy,
}: AgentLibraryScreenProps) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "local" | "official">("all")
  const search = useRef<HTMLInputElement>(null)
  const keyword = query.trim().toLocaleLowerCase()
  const visible = agents.filter((agent) => {
    const configuration = agent.draft ?? agent.configuration
    return (
      (filter === "all" || (agent.source ?? "local") === filter) &&
      `${configuration.name} ${configuration.description}`
        .toLocaleLowerCase()
        .includes(keyword)
    )
  })
  function clearSearch() {
    setQuery("")
    setFilter("all")
    search.current?.focus()
  }

  return (
    <div
      data-slot="navigation-overview"
      data-testid="agent-library"
      aria-busy={busy}
      className="@container/agents relative flex h-full min-h-0 flex-col bg-background"
    >
      <h1 className="sr-only">Agent</h1>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 @min-[640px]/agents:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1" role="group" aria-label="Agent 来源">
            {(["all", "local", "official"] as const).map((value) => (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                className={cn(
                  "touch-manipulation rounded-full px-4 text-muted-foreground transition-colors pointer-coarse:min-h-11",
                  filter === value && "bg-muted text-accent-foreground"
                )}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === "all" ? "全部" : value === "local" ? "本地" : "官方"}
              </Button>
            ))}
          </div>
          <Input
            ref={search}
            type="search"
            name="agent-search"
            autoComplete="off"
            spellCheck={false}
            aria-label="搜索 Agent"
            placeholder="搜索 Agent…"
            value={query}
            onChange={setQuery}
            className="w-full @min-[640px]/agents:w-64"
            classNames={{
              field: "h-9 pointer-coarse:min-h-11",
              input: "text-[13px]",
              rightIcon: "[&_button]:size-9 pointer-coarse:[&_button]:size-11",
            }}
            leftIcon={<Search className="size-4" aria-hidden="true" />}
            rightIcon={query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="清除 Agent 搜索"
                className="touch-manipulation rounded-full transition-colors pointer-coarse:size-11"
                onClick={() => {
                  setQuery("")
                  search.current?.focus()
                }}
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          />
        </div>
        <p className="sr-only" role="status">
          {busy ? "正在处理 Agent…" : `找到 ${visible.length} 个 Agent`}
        </p>
        {visible.length ? (
          <>
            <div
              aria-hidden="true"
              className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.75rem] gap-2 border-b border-border pb-3 text-[11px] text-muted-foreground @min-[640px]/agents:grid-cols-[minmax(0,1fr)_7rem_3rem] @min-[640px]/agents:gap-3 @min-[640px]/agents:px-3"
            >
              <span>名称</span>
              <span>来源</span>
              <span />
            </div>
            <ul aria-label="Agent 列表">
              {visible.map((agent) => {
                const configuration = agent.draft ?? agent.configuration
                const name = configuration.name.trim() || "未命名 Agent"
                const dirty =
                  agent.draft &&
                  JSON.stringify(agent.draft) !==
                    JSON.stringify(agent.configuration)
                return (
                  <li
                    key={agent.id}
                    className="border-b border-border last:border-0"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.75rem] items-center gap-2 rounded-lg py-4 transition-colors hover:bg-muted/50 @min-[640px]/agents:grid-cols-[minmax(0,1fr)_7rem_3rem] @min-[640px]/agents:gap-3 @min-[640px]/agents:px-3">
                      <Button
                        type="button"
                        variant="plain"
                        whileHover={undefined}
                        whileTap={undefined}
                        onClick={() => onOpen(agent.id)}
                        title={name}
                        className="flex min-h-11 min-w-0 touch-manipulation items-center justify-start gap-3 rounded-md rounded-md! text-left outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="sr-only">打开 </span>
                        <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary @min-[440px]/agents:flex">
                          <Bot
                            className="size-5"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {name}
                          </span>
                          {configuration.description.trim() ? (
                            <span className="mt-1 line-clamp-2 text-xs leading-5 break-words text-muted-foreground @min-[640px]/agents:line-clamp-1">
                              {configuration.description}
                            </span>
                          ) : null}
                        </span>
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        <span className="inline-flex rounded-full border border-border px-2 py-1">
                          {agent.source === "official" ? "官方" : "本地"}
                        </span>
                        {dirty ? (
                          <span className="mt-1.5 block text-primary">
                            未保存
                          </span>
                        ) : null}
                      </div>
                      <div className="flex justify-end">
                        {agent.source === "official" && onCopy && canCreate ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`复制 ${name} 为本地 Agent`}
                            title="复制为本地 Agent"
                            disabled={busy}
                            className="touch-manipulation rounded-full transition-colors pointer-coarse:size-11"
                            onClick={() => onCopy(agent.id)}
                          >
                            <Copy aria-hidden="true" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <Bot
              className="mb-4 size-9 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h2 className="text-sm font-medium text-balance">
              {agents.length ? "没有匹配的 Agent" : "还没有 Agent"}
            </h2>
            {!agents.length && !canCreate ? (
              <p className="mt-2 max-w-[40ch] text-xs leading-6 text-muted-foreground">
                当前接入尚未提供 Agent。
              </p>
            ) : null}
            {agents.length ? (
              <Button
                variant="outline"
                className="mt-4 touch-manipulation rounded-full transition-colors pointer-coarse:min-h-11"
                onClick={clearSearch}
              >
                清除筛选
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
