import { cn } from "@/lib/utils";
import type { IntegrationItem } from "./integration-data";

export function IntegrationMark({
  integration,
  className,
}: {
  integration: IntegrationItem;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-2xl border border-border/60 bg-muted",
        className,
      )}
    >
      <span
        aria-hidden="true"
        style={{
          backgroundColor: "currentColor",
          WebkitMaskImage: `url("${integration.logoUrl}")`,
          maskImage: `url("${integration.logoUrl}")`,
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
        className="size-[46%] text-foreground/70"
      />
    </span>
  );
}
