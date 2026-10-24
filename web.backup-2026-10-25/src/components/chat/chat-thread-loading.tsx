import * as React from "react"

import type { ChatThread as LoadedChatThread } from "./chat-thread"

let request: Promise<{ default: typeof LoadedChatThread }> | undefined

function loadChatThread() {
  request ??= import("./chat-thread").then((module) => ({
    default: module.ChatThread,
  }))
  return request
}

const ChatThread = React.lazy(loadChatThread)

export function preloadChatThread() {
  void loadChatThread().catch(() => {})
}

export class ChatThreadLoading extends React.Component<
  React.ComponentProps<typeof LoadedChatThread>,
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-full place-content-center px-6 text-center">
          <p role="alert" className="text-sm">
            聊天记录加载失败。请先复制需要保留的草稿，再刷新页面。
          </p>
        </div>
      )
    }

    return (
      <React.Suspense
        fallback={
          <p role="status" className="p-6 text-center text-sm">
            正在加载聊天记录…
          </p>
        }
      >
        <ChatThread {...this.props} />
      </React.Suspense>
    )
  }
}
