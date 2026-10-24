import { type ReactNode } from "react"
import { Button } from "@/components/motion/button"
import { cn } from "@/lib/utils"

export type BreadcrumbItem = {
  label: ReactNode
  onSelect?: () => void
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: readonly BreadcrumbItem[]
  className?: string
}) {
  return (
    <nav
      aria-label="面包屑"
      className={cn("min-w-0 flex-1 text-sm", className)}
    >
      <ol className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {items.map((item, index) => (
          <li
            key={index}
            aria-current={index === items.length - 1 ? "page" : undefined}
            className={cn(
              "flex min-w-0 items-center gap-2",
              index === 0 && "shrink-0",
              index === items.length - 1 && "font-medium text-foreground"
            )}
          >
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {index < items.length - 1 && item.onSelect ? (
              <Button
                type="button"
                variant="plain"
                whileHover={undefined}
                whileTap={undefined}
                onClick={item.onSelect}
                title={typeof item.label === "string" ? item.label : undefined}
                className="min-h-9 min-w-0 cursor-pointer truncate rounded-sm text-left underline-offset-4 transition-colors outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                {item.label}
              </Button>
            ) : typeof item.label === "string" ? (
              <span className="truncate" title={item.label}>
                {item.label}
              </span>
            ) : (
              item.label
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
