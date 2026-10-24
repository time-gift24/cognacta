// Adapted from @beui-pro/settings-profile · beui.collectui.pro
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  ComputerIcon,
  PaintBoardIcon,
  Settings02Icon,
} from "@hugeicons-pro/core-stroke-rounded"
import { cn } from "@/lib/utils"

export type SettingsSection = "theme" | "palette" | "providers" | "tasks"

const groups = [
  {
    label: "外观",
    items: [
      { id: "theme", label: "主题", icon: ComputerIcon },
      { id: "palette", label: "配色", icon: PaintBoardIcon },
    ],
  },
  {
    label: "运行",
    items: [
      { id: "providers", label: "Provider", icon: Settings02Icon },
      { id: "tasks", label: "Agent 运行", icon: Settings02Icon },
    ],
  },
] as const

export function SettingsNavigation({
  active,
  onNavigate,
}: {
  active: SettingsSection
  onNavigate: (section: SettingsSection) => void
}) {
  return (
    <nav aria-label="设置分区" className="space-y-7 px-2 pt-1">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <a
                key={item.id}
                href={`#client-settings-${item.id}`}
                aria-current={active === item.id ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  onNavigate(item.id)
                }}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                  active === item.id
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <HugeiconsIcon icon={item.icon} size={17} aria-hidden="true" />
                {item.label}
                {active === item.id ? (
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    aria-hidden="true"
                    className="ml-auto"
                  />
                ) : null}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
