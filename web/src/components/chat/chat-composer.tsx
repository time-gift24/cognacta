"use client"

import * as React from "react"
import { ArrowUp01Icon, StopIcon } from "@hugeicons-pro/core-stroke-rounded"
import { HugeiconsIcon } from "@hugeicons/react"

import { useAppDependencies } from "@/app/dependencies"
import { threadTask } from "@/desktop/runtime"
import type { ThreadStore } from "@/chat/thread-store.ts"
import { ApprovalPanel } from "@/components/chat/approval-panel"
import { AgentChatCredits } from "@/components/premium/agent-chat-input/agent-chat-credits"
import {
  AgentComposerAction,
  AgentComposerAttach,
  AgentComposerAttachments,
  AgentComposerInput,
  AgentComposerModel,
  AgentComposerSurface,
} from "@/components/premium/agent-chat-input/composition"
import type { AgentChatCreditsLabels } from "@/components/premium/agent-chat-input/credits-labels"
import type { AgentChatInputStatus } from "@/components/premium/agent-chat-input/types"
import { Button } from "@/components/motion/button"
import { cn } from "@/lib/utils"
import type { ModelChoice } from "@/models/source"
import { providerModelLabel } from "@/providers/source"

const LABELS: Partial<AgentChatCreditsLabels> = {
  editor: "消息输入",
  sendMessage: "发送",
  stopResponse: "停止生成",
  sendingPrompt: "正在发送",
  attachFiles: "添加附件",
  selectModel: "选择模型",
  noMatchingSkills: "没有匹配的技能",
  closePreview: "关闭预览",
  removeAttachment: (name) => `移除附件 ${name}`,
  previewAttachment: (name) => `预览 ${name}`,
}

/** 失败后仍可继续输入，error 仅作语义标记。 */
function toComposerStatus(status: string): AgentChatInputStatus {
  if (status === "stopping") return "streaming"
  if (status === "submitted" || status === "streaming") return status
  if (status === "failed") return "error"
  return "ready"
}

export function ChatComposer({
  store,
  models,
  locked = false,
  className,
}: {
  store: ThreadStore
  models: readonly ModelChoice[]
  locked?: boolean
  className?: string
}) {
  const { desktop } = useAppDependencies()
  const desktopState = React.useSyncExternalStore(
    desktop.subscribe,
    desktop.getState,
    desktop.getState
  )
  const status = React.useSyncExternalStore(
    store.subscribe,
    () => store.getState().status
  )
  const threadError = React.useSyncExternalStore(
    store.subscribe,
    () => store.getState().error?.message
  )
  const draft = React.useSyncExternalStore(
    store.subscribeDraft,
    store.getDraft,
    store.getDraft
  )
  const model = locked
    ? (draft.model ?? "")
    : draft.model
      ? (models.find((choice) => choice.id === draft.model)?.id ?? "")
      : (models.find((choice) => choice.isDefault)?.id ?? "")
  const modelLabel =
    models.find((choice) => choice.id === model)?.label ??
    providerModelLabel(model)
  const task = threadTask(desktopState, store.getState().threadId)
  const ownsTask = task?.threadId === store.getState().threadId
  const approval = ownsTask ? task?.approval : undefined
  const stopping = task?.phase === "stopping" || status === "stopping"

  return (
    <div
      data-slot="chat-composer-anchor"
      className={cn("relative max-w-[736px]", className)}
    >
      {task && ownsTask && approval ? (
        <ApprovalPanel
          key={`${task.runId}:${approval.id}`}
          runtime={desktop}
          task={task}
          approval={approval}
          error={threadError}
          draft={draft.approval}
          onDraftChange={(approval) => store.updateDraft({ approval })}
          onStop={() => store.stop()}
        />
      ) : ownsTask && (task?.error || threadError) ? (
        <p
          role="alert"
          className="absolute inset-x-0 bottom-[calc(100%+12px)] text-xs text-destructive"
        >
          {task?.error ?? threadError}
        </p>
      ) : !task && !model ? (
        <p
          role="alert"
          className="absolute inset-x-0 bottom-[calc(100%+12px)] text-xs text-muted-foreground"
        >
          {models.length
            ? "请选择模型，或在设置中配置全局默认模型。"
            : "尚未配置模型。请在设置的 Provider 中添加接入与模型。"}
        </p>
      ) : null}
      <AgentChatCredits
        aria-label="消息输入"
        labels={LABELS}
        autoFocus
        value={draft.text}
        onValueChange={(text) => store.updateDraft({ text })}
        // 技能体系未上线：空列表让 `/` 保持纯文本，不触发面板。
        skills={[]}
        status={toComposerStatus(status)}
        placeholder=""
        models={models}
        model={model}
        defaultModel=""
        onModelChange={(model) => {
          if (!locked) store.updateDraft({ model })
        }}
        attachments={draft.attachments}
        onAttachmentsChange={(attachments) =>
          store.updateDraft({ attachments })
        }
        onStop={() => store.stop()}
        onSubmit={(text, sent) => {
          if (threadTask(desktop.getState(), store.getState().threadId))
            return false
          if (!model) return false
          const accepted = store.send(
            text,
            sent.map((attachment) => ({
              id: attachment.id,
              name: attachment.name,
              mediaType: attachment.type ?? "application/octet-stream",
              size: attachment.size,
              file: attachment.file,
              url: attachment.url,
            })),
            model
          )
          if (accepted) store.updateDraft({ text: "", attachments: [], model })
          return accepted
        }}
        className="max-w-none"
      >
        <AgentComposerSurface className="px-1 py-2">
          <AgentComposerInput />
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-0.5 text-muted-foreground">
              <AgentComposerAttach />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {locked ? (
                <span
                  aria-label="本会话固定模型"
                  title={modelLabel}
                  className="max-w-56 truncate px-1.5 text-xs text-muted-foreground"
                >
                  {modelLabel || "正在读取固定模型…"}
                </span>
              ) : (
                <AgentComposerModel />
              )}
              {task ? (
                <Button
                  size="icon"
                  variant={ownsTask ? "secondary" : "primary"}
                  className="size-10 rounded-full"
                  aria-label={
                    ownsTask ? (stopping ? "正在停止任务" : "停止任务") : "发送"
                  }
                  title={ownsTask ? "停止当前任务" : "当前任务结束后可发送"}
                  disabled={!ownsTask || stopping}
                  onClick={() => store.stop()}
                >
                  <HugeiconsIcon
                    icon={ownsTask ? StopIcon : ArrowUp01Icon}
                    aria-hidden="true"
                  />
                </Button>
              ) : stopping ? (
                <Button
                  size="icon"
                  className="size-10 rounded-full"
                  disabled
                  aria-label="正在停止任务"
                >
                  <HugeiconsIcon icon={StopIcon} aria-hidden="true" />
                </Button>
              ) : (
                <AgentComposerAction />
              )}
            </div>
          </div>
        </AgentComposerSurface>
        <AgentComposerAttachments />
      </AgentChatCredits>
    </div>
  )
}
