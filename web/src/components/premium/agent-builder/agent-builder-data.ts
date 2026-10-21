import type { IconSvgElement } from "@hugeicons/react"
import {
  ChromeIcon,
  DatabaseIcon,
  MagicWand01Icon,
  McpServerIcon,
  NoteIcon,
  PackageSearch01Icon,
  PuzzleIcon,
  Search01Icon,
  Ticket02Icon,
  WorkflowIcon,
} from "@hugeicons-pro/core-stroke-rounded"

/** 图标属于展示层，来源只传前端业务数据。 */
const RESOURCE_ICONS: Record<string, IconSvgElement> = {
  feishu: McpServerIcon,
  browser: ChromeIcon,
  database: DatabaseIcon,
  search: Search01Icon,
  lookup: PackageSearch01Icon,
  ticket: Ticket02Icon,
  "meeting-notes": NoteIcon,
  "weekly-report": WorkflowIcon,
  "release-notes": MagicWand01Icon,
}

export function agentResourceIcon(id: string): IconSvgElement {
  return RESOURCE_ICONS[id] ?? PuzzleIcon
}
