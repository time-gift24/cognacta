import { HugeiconsIcon } from "@hugeicons/react"
import { FileEditIcon, FileTextIcon } from "@hugeicons-pro/core-stroke-rounded"
import type {
  ChangeSet,
  WorkbenchBackend,
  WorkbenchScope,
} from "@/workbench/backend"
import { useBackendData, type BackendDataState } from "./use-backend-data"

function ChangeCount({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="shrink-0 font-mono text-[11px] tabular-nums">
      <span className="text-primary">+{added}</span>{" "}
      <span className="text-muted-foreground">−{removed}</span>
    </span>
  )
}

function ChangeContent({
  changeSet,
}: {
  changeSet: BackendDataState<ChangeSet>
}) {
  if (changeSet.status === "loading") {
    return (
      <div aria-hidden="true">
        <div className="h-[46px] animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="mt-2 space-y-2.5 p-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-4 animate-pulse rounded bg-muted motion-reduce:animate-none"
              style={{ width: `${82 - ((index * 17) % 40)}%` }}
            />
          ))}
        </div>
      </div>
    )
  }
  if (changeSet.status === "error") {
    return (
      <p className="px-1 py-2 text-xs text-muted-foreground">
        变更摘要加载失败。
      </p>
    )
  }
  const { data } = changeSet
  if (data.files.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-muted-foreground">
        本次会话还没有改动文件。
      </p>
    )
  }
  return (
    <>
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
        <HugeiconsIcon
          icon={FileEditIcon}
          size={16}
          strokeWidth={1.7}
          aria-hidden="true"
          className="shrink-0 text-muted-foreground"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          已编辑 {data.fileCount} 个文件
        </span>
        <span className="font-mono text-xs tabular-nums">
          <span className="text-primary">+{data.added}</span>{" "}
          <span className="text-muted-foreground">−{data.removed}</span>
        </span>
      </div>
      <ul className="mt-2 space-y-0.5">
        {data.files.map((file) => (
          <li
            key={file.path}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2"
          >
            <HugeiconsIcon
              icon={FileTextIcon}
              size={14}
              strokeWidth={1.7}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">
              {file.path}
            </span>
            <ChangeCount added={file.added} removed={file.removed} />
          </li>
        ))}
      </ul>
    </>
  )
}

export function ChangesView({
  backend,
  scope,
}: {
  backend: WorkbenchBackend
  scope: WorkbenchScope | null
}) {
  const changeSet = useBackendData(
    JSON.stringify(scope),
    () =>
      scope
        ? backend.getChangeSet(scope)
        : Promise.resolve({ fileCount: 0, added: 0, removed: 0, files: [] }),
    backend
  )
  return (
    <div className="h-full overflow-auto p-3">
      <ChangeContent changeSet={changeSet} />
    </div>
  )
}
