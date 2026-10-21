import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Folder01Icon } from "@hugeicons-pro/core-stroke-rounded"
import { Button } from "@/components/motion/button"
import { Input } from "@/components/motion/input"
import {
  AnimatedModal,
  AnimatedModalTitle,
} from "@/components/motion/animated-modal"
import type { Workspace } from "@/workspace/store"
import type { WorkspaceDirectory } from "@/workspace/access"
import { useAppDependencies } from "@/app/dependencies"
import { useBackendData } from "@/components/workbench/use-backend-data"

export function WorkspacePicker({
  open,
  onOpenChange,
  workspaces,
  onPick,
  onAdd,
  addOnly,
  fallbackFocusRef,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaces: readonly Workspace[]
  onPick: (workspaceId: string) => void
  onAdd: (directory: WorkspaceDirectory) => void
  addOnly: boolean
  fallbackFocusRef: RefObject<HTMLElement | null>
}) {
  const { workspaceAccess, desktop } = useAppDependencies()
  const directories = useBackendData(
    `${open}:${addOnly}`,
    () => workspaceAccess.listDirectories(),
    workspaceAccess
  )
  const inputId = useId()
  const [typedPath, setPath] = useState<string | null>(null)
  const path =
    typedPath ??
    (directories.status === "ready" ? (directories.data[0]?.path ?? "") : "")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const attempt = useRef(0)
  const previousFocus = useRef<HTMLElement | null>(null)
  const picked = useRef(false)
  useLayoutEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
      picked.current = false
    }
  }, [open])
  useEffect(
    () => () => {
      attempt.current += 1
    },
    []
  )

  function close() {
    attempt.current += 1
    setBusy(false)
    setPath(null)
    setError(null)
    onOpenChange(false)
  }

  async function add() {
    if (busy || !path) return
    const current = ++attempt.current
    setBusy(true)
    setError(null)
    try {
      const selected = await workspaceAccess.resolveDirectory(path)
      if (current !== attempt.current) return
      onAdd(selected)
      picked.current = true
      close()
    } catch (cause) {
      if (current === attempt.current)
        setError(
          cause instanceof Error ? cause.message : "无法添加工作区，请重试。"
        )
    } finally {
      if (current === attempt.current) setBusy(false)
    }
  }

  return (
    <AnimatedModal
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      panelClassName="grid gap-4 p-6 border-border bg-popover shadow-none"
      panelDataSlot="dialog-content"
      showCloseButton
      onExitComplete={() => {
        const previous = previousFocus.current
        const editor = picked.current
          ? fallbackFocusRef.current?.querySelector<HTMLElement>(
              '[contenteditable="true"]'
            )
          : null
        ;(
          editor ??
          (previous?.isConnected &&
          !previous.closest("[inert]") &&
          previous.getClientRects().length
            ? previous
            : fallbackFocusRef.current)
        )?.focus({ preventScroll: true })
      }}
    >
      <div className="flex flex-col gap-2 pr-8 text-left">
        <AnimatedModalTitle className="text-lg leading-none font-medium">{addOnly ? "添加工作区" : "选择工作区"}</AnimatedModalTitle>
      </div>
      {!addOnly && workspaces.length > 0 ? (
        <div className="grid gap-1" aria-label="已有工作区">
          {workspaces.map((workspace) => (
            <Button
              key={workspace.id}
              variant="ghost"
              disabled={busy}
              className="h-auto min-h-12 min-w-0 justify-start gap-3 rounded-lg px-3 py-2 text-left"
              onClick={() => {
                onPick(workspace.id)
                picked.current = true
                close()
              }}
            >
              <HugeiconsIcon
                icon={Folder01Icon}
                size={18}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block truncate">{workspace.name}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {workspace.path}
                </span>
              </span>
            </Button>
          ))}
        </div>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void add()
        }}
        className="grid min-w-0 gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={inputId} className="text-sm font-medium">
            目录
          </label>
          <span className="text-xs text-muted-foreground">可用目录</span>
        </div>
        <Input
          id={inputId}
          value={path}
          disabled={busy}
          onChange={(value) => {
            setPath(value)
            setError(null)
          }}
          error={Boolean(error)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          classNames={{ field: "h-9", input: "text-sm" }}
          autoComplete="off"
        />
        <div className="grid gap-1">
          {(directories.status === "ready" ? directories.data : []).map(
            (directory) => (
              <Button
                key={directory.path}
                type="button"
                variant="ghost"
                disabled={busy}
                aria-pressed={path === directory.path}
                onClick={() => {
                  setPath(directory.path)
                  setError(null)
                }}
                className="h-9 min-w-0 justify-start gap-2 rounded-lg px-3 font-normal aria-pressed:bg-accent"
              >
                <HugeiconsIcon
                  icon={Folder01Icon}
                  size={16}
                  aria-hidden="true"
                />
                <span className="truncate">{directory.path}</span>
              </Button>
            )
          )}
        </div>
        {error ? (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {desktop.getState().simulated
            ? "当前为演示环境，工作区与会话在刷新后重置。"
            : "工作区与会话在重新打开应用后重置。"}
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            className="rounded-full"
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={busy || !path.trim()}
            className="rounded-full"
          >
            {busy ? "正在添加…" : error ? "重试" : "打开工作区"}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  )
}
