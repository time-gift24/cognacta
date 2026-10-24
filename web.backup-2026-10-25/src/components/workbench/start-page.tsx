import { Button } from "@/components/motion/button"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  FolderOpenIcon,
  GitMergeIcon,
  Globe02Icon,
  PlusSignIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import type { RecommendedSite } from "@/workbench/backend";
import type { BackendDataState } from "./use-backend-data";

function ToolRow({
  icon,
  label,
  onClick,
}: {
  icon: IconSvgElement;
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <Button variant="plain" pressScale={1} whileHover={undefined}
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
      >
        <HugeiconsIcon
          icon={icon}
          size={16}
          strokeWidth={1.7}
          aria-hidden="true"
          className="shrink-0 text-muted-foreground"
        />
        <span className="min-w-0 flex-1 text-sm">{label}</span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={14}
          aria-hidden="true"
          className="shrink-0 text-muted-foreground/60"
        />
      </Button>
    </li>
  );
}

function SiteTile({
  site,
  onOpen,
}: {
  site: RecommendedSite;
  onOpen: (site: RecommendedSite) => void;
}) {
  return (
    <Button variant="plain" pressScale={1} whileHover={undefined}
      type="button"
      onClick={() => onOpen(site)}
      className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left outline-none transition-colors hover:border-(--border-strong) focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-medium text-accent-foreground"
      >
        {site.initial}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm">{site.name}</span>
        <span className="block truncate font-mono text-[11px] text-muted-foreground">
          {site.url}
        </span>
      </span>
    </Button>
  );
}

function SiteTiles({
  sites,
  onOpenSite,
}: {
  sites: BackendDataState<readonly RecommendedSite[]>;
  onOpenSite: (site: RecommendedSite) => void;
}) {
  if (sites.status === "loading") {
    return (
      <div className="mt-2 grid grid-cols-2 gap-2 @[26rem]:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-[59px] animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }
  if (sites.status === "error") {
    return (
      <p className="mt-2 px-1 text-xs text-muted-foreground">
        推荐内容加载失败。
      </p>
    );
  }
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 @[26rem]:grid-cols-3">
      {sites.data.map((site) => (
        <SiteTile key={site.url} site={site} onOpen={onOpenSite} />
      ))}
    </div>
  );
}

export function StartPage({
  sites,
  onOpenChanges,
  onOpenFiles,
  onNewTab,
  onOpenSite,
  onOpenOperationsBrowser,
}: {
  sites: BackendDataState<readonly RecommendedSite[]>;
  onOpenChanges: () => void;
  onOpenFiles: () => void;
  onNewTab: () => void;
  onOpenSite: (site: RecommendedSite) => void;
  onOpenOperationsBrowser: () => void;
}) {
  return (
    <div className="h-full overflow-auto px-4 py-5">
      <section aria-label="工具">
        <h3 className="px-1 text-xs font-medium text-muted-foreground">工具</h3>
        <ul className="mt-1.5 space-y-0.5">
          <ToolRow icon={Globe02Icon} label="运维浏览器" onClick={onOpenOperationsBrowser} />
          <ToolRow
            icon={GitMergeIcon}
            label="变更"
            onClick={onOpenChanges}
          />
          <ToolRow
            icon={FolderOpenIcon}
            label="文件"
            onClick={onOpenFiles}
          />
          <ToolRow
            icon={PlusSignIcon}
            label="新建页面"
            onClick={onNewTab}
          />
        </ul>
      </section>
      {sites.status !== "ready" || sites.data.length > 0 ? (
        <section aria-label="推荐" className="mt-7">
          <h3 className="px-1 text-xs font-medium text-muted-foreground">推荐</h3>
          <SiteTiles sites={sites} onOpenSite={onOpenSite} />
        </section>
      ) : null}
    </div>
  );
}
