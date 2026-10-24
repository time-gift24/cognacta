// Adapted from @beui-pro/docs-article · beui.collectui.pro
"use client"

import type { ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons-pro/core-stroke-rounded"
import { DocsMobileNav as BeuiDocsMobileNav } from "@/components/beui/premium/docs-pages/docs-mobile-nav"
import { dialogPanelMotion } from "@/components/motion/animated-modal"

export type DocsMobileNavProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExitComplete?: () => void
  title: string
  closeLabel: string
  /** The file navigation rendered below the header content. */
  nav: ReactNode
  children?: ReactNode
}

export function DocsMobileNav({
  open,
  onOpenChange,
  onExitComplete,
  title,
  closeLabel,
  nav,
  children,
}: DocsMobileNavProps) {
  return (
    <BeuiDocsMobileNav
      open={open}
      onOpenChange={onOpenChange}
      onExitComplete={onExitComplete}
      title={title}
      closeLabel={closeLabel}
      closeIcon={
        <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
      }
      panelClassName="chat-modal-panel relative rounded-xl"
      panelMotion={dialogPanelMotion}
      nav={
        <div className="max-h-[75dvh] overflow-y-auto p-5">
          {children}
          <div className="mt-5">{nav}</div>
        </div>
      }
    />
  )
}
