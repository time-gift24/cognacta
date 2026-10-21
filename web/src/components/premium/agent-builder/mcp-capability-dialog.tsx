"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/motion/animated-modal"
import type { McpCapability, McpServer } from "@/agents/source"
import { agentResourceIcon } from "./agent-builder-data"

const GROUPS = [
  { key: "tools", label: "工具" },
  { key: "resources", label: "资源" },
  { key: "prompts", label: "提示词" },
] as const

function CapabilityGroup({
  label,
  items,
}: {
  label: string
  items: readonly McpCapability[]
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-baseline gap-2 text-sm font-medium">
        {label}
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </h3>
      {items.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((item) => (
            <li key={item.name} className="px-4 py-3">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              {item.params ? (
                <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                  {item.params}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">
          此服务未提供{label}
        </p>
      )}
    </section>
  )
}

/** 展示一个 MCP 服务当前提供的能力清单：工具、资源和提示词。 */
export function McpCapabilityDialog({
  server,
  open,
  onOpenChange,
}: {
  server: McpServer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      panelClassName="grid gap-4 p-6 max-h-[85vh] grid-rows-[auto_minmax(0,1fr)] sm:max-w-xl"
      panelDataSlot="dialog-content"
      showCloseButton
    >
      {server ? (
        <>
          <div className="flex items-center gap-3 pr-8 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
              <HugeiconsIcon
                icon={agentResourceIcon(server.id)}
                aria-hidden="true"
                size={18}
              />
            </span>
            <span className="min-w-0">
              <AnimatedModalTitle className="truncate text-lg leading-none font-medium">{server.name}</AnimatedModalTitle>
              <AnimatedModalDescription className="mt-1 text-sm text-muted-foreground">
                {server.description}
              </AnimatedModalDescription>
            </span>
          </div>
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto pr-1">
            {GROUPS.map(({ key, label }) => (
              <CapabilityGroup
                key={key}
                label={label}
                items={server.capabilities[key]}
              />
            ))}
          </div>
        </>
      ) : null}
    </AnimatedModal>
  )
}
