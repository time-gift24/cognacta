"use client"

import * as React from "react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { Folder01Icon } from "@hugeicons-pro/core-stroke-rounded"
import { HugeiconsIcon } from "@hugeicons/react"

import { useAppDependencies } from "@/app/dependencies"
import { threadTask } from "@/desktop/runtime"
import { useThreadStore } from "@/chat/react.ts"
import { ChatComposer } from "@/components/chat/chat-composer"
import {
  ChatThreadLoading,
  preloadChatThread,
} from "@/components/chat/chat-thread-loading"
import { Button } from "@/components/motion/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SPRING_PANEL } from "@/lib/ease"
import type { ModelChoice } from "@/models/source"
import { providerModelLabel } from "@/providers/source"

const SUGGESTIONS = [
  "为什么这次构建这么慢？",
  "帮我排查一下昨天部署失败的原因",
  "总结一下这个仓库本周的变更",
]

const DEFAULT_CHAT_WIDTH = 920
const MIN_CHAT_WIDTH = 640
const CHAT_WIDTH_EDGE_BUDGET = 176
const CHAT_WIDTH_STORAGE_KEY = "cognacta.chat.contentWidth"

type ChatWidthSide = "left" | "right"
type ChatWidthDrag = {
  side: ChatWidthSide
  pointerId: number
  startX: number
  startWidth: number
}

function readChatWidthPreference(): number | null {
  if (typeof window === "undefined") return null
  try {
    const value = Number(window.localStorage.getItem(CHAT_WIDTH_STORAGE_KEY))
    return Number.isFinite(value) && value >= MIN_CHAT_WIDTH ? value : null
  } catch {
    return null
  }
}

function clampChatWidth(width: number, containerWidth: number) {
  const max = Math.max(MIN_CHAT_WIDTH, containerWidth - CHAT_WIDTH_EDGE_BUDGET)
  return Math.min(Math.max(width, MIN_CHAT_WIDTH), max)
}

function saveChatWidthPreference(width: number) {
  try {
    window.localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(width))
  } catch {
    // Resizing still works when browser storage is unavailable.
  }
}

function ChatWidthHandles({
  containerRef,
  onWidthChange,
  onWidthCommit,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  onWidthChange: (width: number) => void
  onWidthCommit: (width: number) => void
}) {
  const drag = React.useRef<ChatWidthDrag | null>(null)

  const currentWidth = (container: HTMLDivElement) =>
    container
      .querySelector<HTMLElement>('[data-slot="message-scroller-content"]')
      ?.getBoundingClientRect().width ?? DEFAULT_CHAT_WIDTH

  const widthAt = (side: ChatWidthSide, clientX: number) => {
    const active = drag.current
    const container = containerRef.current
    if (!active || !container) return null
    const delta = clientX - active.startX
    return clampChatWidth(
      active.startWidth + (side === "right" ? delta : -delta) * 2,
      container.clientWidth,
    )
  }

  const endDrag = (
    side: ChatWidthSide,
    event: React.PointerEvent<HTMLDivElement>,
    commit: boolean,
  ) => {
    const active = drag.current
    if (!active || active.side !== side || active.pointerId !== event.pointerId)
      return
    const width = widthAt(side, event.clientX) ?? active.startWidth
    onWidthChange(commit ? width : active.startWidth)
    if (commit && event.clientX !== active.startX) onWidthCommit(width)
    drag.current = null
    delete event.currentTarget.dataset.dragging
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          className="chat-width-handle"
          data-side={side}
          role="separator"
          aria-orientation="vertical"
          aria-label="调整对话宽度"
          aria-valuemin={MIN_CHAT_WIDTH}
          aria-valuemax={Math.max(
            MIN_CHAT_WIDTH,
            (containerRef.current?.clientWidth ??
              DEFAULT_CHAT_WIDTH + CHAT_WIDTH_EDGE_BUDGET) -
              CHAT_WIDTH_EDGE_BUDGET,
          )}
          aria-valuenow={Math.round(
            containerRef.current ? currentWidth(containerRef.current) : DEFAULT_CHAT_WIDTH,
          )}
          tabIndex={0}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect()
            event.currentTarget.style.setProperty(
              "--chat-width-handle-pointer-y",
              `${event.clientY - bounds.top}px`,
            )
            const width = widthAt(side, event.clientX)
            if (width !== null) onWidthChange(width)
          }}
          onPointerDown={(event) => {
            if (event.button !== 0 || !containerRef.current) return
            event.preventDefault()
            drag.current = {
              side,
              pointerId: event.pointerId,
              startX: event.clientX,
              startWidth: clampChatWidth(
                currentWidth(containerRef.current),
                containerRef.current.clientWidth,
              ),
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            event.currentTarget.dataset.dragging = "true"
          }}
          onPointerUp={(event) => endDrag(side, event, true)}
          onPointerCancel={(event) => endDrag(side, event, false)}
          onLostPointerCapture={(event) => endDrag(side, event, false)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
            const container = containerRef.current
            if (!container) return
            event.preventDefault()
            const outward =
              side === "right"
                ? event.key === "ArrowRight"
                : event.key === "ArrowLeft"
            const step = event.shiftKey ? 64 : 32
            const width = clampChatWidth(
              currentWidth(container) + (outward ? step : -step),
              container.clientWidth,
            )
            onWidthChange(width)
            onWidthCommit(width)
          }}
        />
      ))}
    </>
  )
}

export function ChatScreen({
  threadId = "main",
  models,
  workspaceName,
  suggestions = SUGGESTIONS,
}: {
  threadId?: string
  models: readonly ModelChoice[]
  workspaceName?: string
  suggestions?: readonly string[]
}) {
  const { threads, desktop, runs } = useAppDependencies()
  const screenRef = React.useRef<HTMLDivElement>(null)
  const widthPreference = React.useRef(readChatWidthPreference())
  const [chatWidth, setChatWidth] = React.useState<number | null>(null)
  const [modelSnapshot, setModelSnapshot] = React.useState<{
    threadId: string
    model: string
  } | null>(null)
  const fixedModel =
    modelSnapshot?.threadId === threadId ? modelSnapshot.model : null
  const desktopTask = React.useSyncExternalStore(
    desktop.subscribe,
    () => threadTask(desktop.getState(), threadId),
    () => threadTask(desktop.getState(), threadId)
  )
  const store = useThreadStore(threadId, threads)
  const empty = React.useSyncExternalStore(
    store.subscribe,
    () => store.getState().messages.length === 0
  )
  const draftModel = React.useSyncExternalStore(
    store.subscribeDraft,
    () => store.getDraft().model
  )
  React.useEffect(() => {
    if (!runs || empty || desktopTask) return
    let live = true
    void runs
      .snapshot(threadId)
      .then((snapshot) => {
        if (!live || typeof snapshot?.model !== "string") return
        setModelSnapshot({ threadId, model: snapshot.model })
        store.updateDraft({ model: snapshot.model })
      })
      .catch(() => {
        /* Run history exposes snapshot read failures and supports retry. */
      })
    return () => {
      live = false
    }
  }, [runs, threadId, empty, desktopTask, store])
  const actualFixedModel = fixedModel ?? (!empty ? draftModel : null)
  const sessionModels = actualFixedModel
    ? [
        {
          id: actualFixedModel,
          label:
            models.find((model) => model.id === actualFixedModel)?.label ??
            providerModelLabel(actualFixedModel),
        },
      ]
    : models
  const editMessage = React.useCallback(
    (text: string) => {
      store.updateDraft({ text, attachments: [] })
    },
    [store]
  )
  const reduce = useReducedMotion()

  React.useLayoutEffect(() => {
    const screen = screenRef.current
    if (!screen) return
    const updateWidth = () => {
      const preferred = widthPreference.current
      if (preferred !== null)
        setChatWidth(clampChatWidth(preferred, screen.clientWidth))
    }
    const observer = new ResizeObserver(updateWidth)
    observer.observe(screen)
    updateWidth()
    return () => observer.disconnect()
  }, [])

  const setAndRememberChatWidth = React.useCallback((width: number) => {
    widthPreference.current = width
    setChatWidth(width)
    saveChatWidthPreference(width)
  }, [])

  const composer = (
    <ChatComposer
      store={store}
      models={sessionModels}
      locked={!empty}
      className="mx-auto w-full"
    />
  )

  return (
    <TooltipProvider>
      <LayoutGroup id={threadId}>
        <div
          ref={screenRef}
          className="relative isolate flex h-full min-h-0 flex-col"
          style={
            chatWidth === null
              ? undefined
              : ({ "--chat-content-width": `${chatWidth}px` } as React.CSSProperties)
          }
        >
          {empty ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : SPRING_PANEL}
                className="flex w-full flex-col items-center gap-6"
                style={{ maxWidth: "calc(var(--chat-content-width, 920px) + 32px)" }}
              >
                <motion.div
                  layoutId={reduce ? undefined : "composer"}
                  className="w-full"
                  onInputCapture={preloadChatThread}
                  onPointerEnter={preloadChatThread}
                >
                  {composer}
                </motion.div>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      disabled={
                        !sessionModels.some((choice) =>
                          draftModel
                            ? choice.id === draftModel
                            : choice.isDefault
                        ) || Boolean(desktopTask)
                      }
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        if (threadTask(desktop.getState(), threadId)) return
                        preloadChatThread()
                        const selected = draftModel
                          ? sessionModels.find(
                              (choice) => choice.id === draftModel
                            )?.id
                          : sessionModels.find((choice) => choice.isDefault)?.id
                        if (!selected) return
                        const accepted = store.send(
                          suggestion,
                          undefined,
                          selected
                        )
                        if (accepted) store.updateDraft({ model: selected })
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              {workspaceName ? (
                <div className="flex shrink-0 items-center gap-2 px-4 py-3 text-sm text-muted-foreground sm:px-8">
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{workspaceName}</span>
                </div>
              ) : null}
              <div className="relative z-[1] min-h-0 flex-1">
                <ChatThreadLoading store={store} onEditMessage={editMessage} />
              </div>
              <div className="relative z-[1] shrink-0 px-2 pb-4 sm:pb-6">
                <motion.div
                  layoutId={reduce ? undefined : "composer"}
                  className="mx-auto w-full"
                  style={{ maxWidth: "calc(var(--chat-content-width, 920px) + 32px)" }}
                  onInputCapture={preloadChatThread}
                  onPointerEnter={preloadChatThread}
                >
                  {composer}
                </motion.div>
              </div>
            </>
          )}
          {!empty && (
            <ChatWidthHandles
              containerRef={screenRef}
              onWidthChange={setChatWidth}
              onWidthCommit={setAndRememberChatWidth}
            />
          )}
        </div>
      </LayoutGroup>
    </TooltipProvider>
  )
}
