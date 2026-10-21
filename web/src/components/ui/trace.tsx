import * as React from "react"
import { cn } from "cn"

import { ChevronDown } from "lucide-react"

function Trace({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="trace"
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 *:has-[>[data-slot=trace-line]]:flex *:has-[>[data-slot=trace-line]]:w-fit *:has-[>[data-slot=trace-line]]:max-w-full *:has-[>[data-slot=trace-line]]:min-w-0 *:has-[>[data-slot=trace-line]]:rounded-md *:has-[>[data-slot=trace-line]]:text-left *:has-[>[data-slot=trace-line]]:outline-none *:has-[>[data-slot=trace-line]]:focus-visible:ring-3 *:has-[>[data-slot=trace-line]]:focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}

function TraceLine({
  className,
  status,
  ...props
}: React.ComponentProps<"span"> & {
  status?: "running" | "error" | "pending"
}) {
  return (
    <span
      data-slot="trace-line"
      data-status={status}
      className={cn(
        "flex w-fit max-w-full min-w-0 items-center gap-2 text-sm text-muted-foreground transition-colors motion-reduce:transition-none in-[a,button]:cursor-pointer in-[a:hover,button:hover]:text-foreground data-[status=error]:text-destructive data-[status=error]:in-[a:hover,button:hover]:text-destructive data-[status=pending]:opacity-60 motion-safe:data-[status=running]:*:data-[slot=trace-title]:shimmer",
        className
      )}
      {...props}
    />
  )
}

function TraceIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="trace-icon"
      aria-hidden="true"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [[data-slot=trace-title]~&]:-ml-1",
        className
      )}
      {...props}
    />
  )
}

function TraceTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="trace-title"
      className={cn("min-w-0 truncate motion-reduce:shimmer-none", className)}
      {...props}
    />
  )
}

function TraceDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="trace-description"
      className={cn(
        "shrink-0 text-[11px] text-muted-foreground/70 tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function TraceDisclosure({
  title,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  onFocusCapture,
  contentClassName,
}: {
  title: React.ReactNode
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onFocusCapture?: React.FocusEventHandler<HTMLDivElement>
  /** 内容体的附加类，长内容可用 max-h + overflow-y-auto 建立内部滚动。 */
  contentClassName?: string
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const expanded = open ?? uncontrolledOpen
  const contentId = React.useId()
  const triggerId = `${contentId}-trigger`

  const setExpanded = (next: boolean) => {
    if (open === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div data-slot="trace-disclosure" className="min-w-0">
      <button
        id={triggerId}
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded(!expanded)}
        className="flex min-h-0 w-fit max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-md px-0 py-0 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="min-w-0 flex-initial truncate text-sm font-normal">
          {title}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "grid size-4 shrink-0 place-items-center text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            expanded && "rotate-180"
          )}
        >
          <ChevronDown className="size-3.5" />
        </span>
      </button>
      {/* 用 grid-template-rows 0fr↔1fr 过渡：嵌套/流式增行由 1fr 自然撑开，
          不测量内容高度，也就不会出现“内层先动、外层再追一次”的延迟。 */}
      <section
        id={contentId}
        aria-labelledby={triggerId}
        data-state={expanded ? "open" : "closed"}
        aria-hidden={!expanded}
        inert={!expanded}
        className={cn(
          "grid min-w-0 transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        {/* 保持内容挂载，保留嵌套步骤的展开状态；1fr 随内容自然增长，不再二次动画高度。 */}
        <div className="min-h-0 overflow-hidden">
          <div
            data-slot="trace-disclosure-content"
            onFocusCapture={onFocusCapture}
            className="mt-2 mb-1 ml-[calc(--spacing(2)-1px)] min-w-0 border-l pr-1 pl-4 leading-normal wrap-break-word text-muted-foreground"
          >
            <div
              data-slot="trace-disclosure-body"
              className={cn("min-w-0", contentClassName)}
            >
              {children}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export {
  Trace,
  TraceLine,
  TraceIcon,
  TraceTitle,
  TraceDescription,
  TraceDisclosure,
}
