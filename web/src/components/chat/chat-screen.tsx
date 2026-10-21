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
        <div className="flex h-full min-h-0 flex-col">
          {empty ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 sm:px-8">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : SPRING_PANEL}
                className="flex w-full max-w-[736px] flex-col items-center gap-6"
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
              <div className="min-h-0 flex-1">
                <ChatThreadLoading store={store} onEditMessage={editMessage} />
              </div>
              <div className="shrink-0 px-4 pb-4 sm:px-8 sm:pb-6">
                <motion.div
                  layoutId={reduce ? undefined : "composer"}
                  className="mx-auto max-w-[736px]"
                  onInputCapture={preloadChatThread}
                  onPointerEnter={preloadChatThread}
                >
                  {composer}
                </motion.div>
              </div>
            </>
          )}
        </div>
      </LayoutGroup>
    </TooltipProvider>
  )
}
