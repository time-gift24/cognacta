import type { ComponentProps } from "react"
import {
  Tooltip,
  TooltipContent as BeuiTooltipContent,
  TooltipProvider as BeuiTooltipProvider,
  TooltipTrigger,
} from "@/components/beui/motion/tooltip"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: Omit<ComponentProps<typeof BeuiTooltipProvider>, "delay"> & {
  delayDuration?: number
}) {
  return <BeuiTooltipProvider delay={delayDuration} {...props} />
}

function TooltipContent({
  side = "top",
  align = "center",
  sideOffset = 0,
  arrow = true,
  ...props
}: ComponentProps<typeof BeuiTooltipContent>) {
  return (
    <BeuiTooltipContent
      side={side}
      align={align}
      sideOffset={sideOffset}
      arrow={arrow}
      {...props}
    />
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
