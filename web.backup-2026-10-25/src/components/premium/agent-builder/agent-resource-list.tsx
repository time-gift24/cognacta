"use client"

import { Button } from "@/components/motion/button"

import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons-pro/core-stroke-rounded"
import { Switch } from "@/components/motion/switch"
import { cn } from "@/lib/utils"
import type { AgentResource } from "@/agents/source"
import { agentResourceIcon } from "./agent-builder-data"

export type AgentResourceListProps = {
  resources: readonly AgentResource[]
  selected: readonly string[]
  disabled: boolean
  emptyLabel: string
  onToggle: (id: string, enabled: boolean) => void
  /** 提供后，点击行的名称/描述区会触发查看详情（如 MCP 能力清单）。 */
  onInspect?: (id: string) => void
}

/**
 * Agent 可用的 MCP 服务、工具或技能。启用的行用浅绿底徽标标示，
 * 当前生效的集合一眼可读。
 */
export function AgentResourceList({
  resources,
  selected,
  disabled,
  emptyLabel,
  onToggle,
  onInspect,
}: AgentResourceListProps) {
  const missing = selected.filter(
    (id) => !resources.some((resource) => resource.id === id)
  )
  if (!resources.length && !missing.length) {
    return <p className="py-6 text-xs text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-border">
      {missing.map((id) => (
        <li
          key={id}
          className="flex items-center justify-between gap-2 py-3 text-xs text-destructive"
        >
          <span className="break-all">资源不可用：{id}</span>
          <Button variant="plain" pressScale={1} whileHover={undefined}
            disabled={disabled}
            className="shrink-0 underline disabled:opacity-50"
            onClick={() => onToggle(id, false)}
          >
            移除
          </Button>
        </li>
      ))}
      {resources.map((resource) => {
        const enabled = selected.includes(resource.id)
        const icon = agentResourceIcon(resource.id)

        const summary = (
          <>
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-150 motion-reduce:transition-none",
                enabled
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <HugeiconsIcon icon={icon} aria-hidden="true" size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">
                {resource.name}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {resource.description}
              </span>
              {resource.contentId || resource.source ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {resource.source === "official"
                    ? "官方"
                    : resource.contentId
                      ? "本地"
                      : "本地草稿"}
                </span>
              ) : null}
            </span>
          </>
        )

        return (
          <li
            className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-150 hover:bg-background motion-reduce:transition-none"
            key={resource.id}
          >
            {onInspect ? (
              <Button variant="plain" pressScale={1} whileHover={undefined}
                type="button"
                onClick={() => onInspect(resource.id)}
                className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="sr-only">查看 </span>
                {summary}
                <span className="sr-only"> 的能力</span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  aria-hidden="true"
                  size={12}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              </Button>
            ) : (
              summary
            )}
            <Switch
              ariaLabel={`启用 ${resource.name}`}
              checked={enabled}
              disabled={disabled}
              onCheckedChange={(checked) => onToggle(resource.id, checked)}
            />
          </li>
        )
      })}
    </ul>
  )
}
