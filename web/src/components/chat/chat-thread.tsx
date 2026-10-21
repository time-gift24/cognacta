"use client";

import { memo, useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useAppDependencies } from "@/app/dependencies";
import { threadTask } from "@/desktop/runtime";
import type { ThreadStore } from "@/chat/thread-store.ts";
import type { ChatMessageView } from "@/chat/fold.ts";
import { useThreadState } from "@/chat/react.ts";
import { MessageView } from "@/components/chat/message-view";
import { AIThinkingLoader } from "@/components/premium/ai-thinking-loader";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";

/** 卸载前为 index.css 的 chat-swap-out 动画预留的时间（ms）。 */
const LOADER_EXIT_MS = 220;

/** 过场与内容同格叠放，交叉淡入淡出时避免布局跳动。 */
function AssistantSlot({
  message,
  busy,
  onRetry,
  onEdit,
  retryDisabled,
}: {
  message: ChatMessageView;
  busy: boolean;
  onRetry: () => void;
  onEdit?: (text: string) => void;
  retryDisabled: boolean;
}) {
  const waiting =
    busy && message.state === "streaming" && message.parts.length === 0;

  // 在渲染期派生退场状态，避免内容到达时先卸载过场再挂回。
  const [exiting, setExiting] = useState(false);
  const [prevWaiting, setPrevWaiting] = useState(waiting);
  if (prevWaiting !== waiting) {
    setPrevWaiting(waiting);
    setExiting(!waiting);
  }
  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => setExiting(false), LOADER_EXIT_MS);
    return () => clearTimeout(timer);
  }, [exiting]);

  return (
    <div className="grid">
      <div className="col-start-1 row-start-1 min-w-0">
        {!waiting && (
          <MessageView
            message={message}
            streaming={busy && message.state === "streaming"}
            onRetry={onRetry}
            retryDisabled={retryDisabled}
            onEdit={onEdit}
          />
        )}
      </div>
      {(waiting || exiting) && (
        <div
          className={`col-start-1 row-start-1${waiting ? "" : " chat-swap-out"}`}
          aria-hidden={!waiting}
        >
          <AIThinkingLoader
            variant="diamond"
            label="正在思考"
            paused={!waiting}
          />
        </div>
      )}
    </div>
  );
}

const ThreadMessage = memo(function ThreadMessage({
  message,
  streaming,
  onRetry,
  retryDisabled,
  onEdit,
}: {
  message: ChatMessageView;
  streaming: boolean;
  onRetry: (messageId: string) => void;
  retryDisabled: boolean;
  onEdit?: (text: string) => void;
}) {
  const retry = () => onRetry(message.id);
  return (
    <MessageScrollerItem
      messageId={message.id}
      scrollAnchor={message.role === "user"}
    >
      {message.role === "assistant" ? (
        <AssistantSlot
          message={message}
          busy={streaming}
          onRetry={retry}
          retryDisabled={retryDisabled}
          onEdit={onEdit}
        />
      ) : (
        <MessageView
          message={message}
          streaming={false}
          onRetry={retry}
          retryDisabled={retryDisabled}
          onEdit={onEdit}
        />
      )}
    </MessageScrollerItem>
  );
});

export function ChatThread({
  store,
  onEditMessage,
}: {
  store: ThreadStore;
  onEditMessage?: (text: string) => void;
}) {
  const { desktop } = useAppDependencies();
  const desktopBusy = useSyncExternalStore(
    desktop.subscribe,
    () => threadTask(desktop.getState(), store.getState().threadId) !== null,
    () => threadTask(desktop.getState(), store.getState().threadId) !== null,
  );
  const onRetry = useCallback((messageId: string) => {
    if (threadTask(desktop.getState(), store.getState().threadId) || store.appendOnly) return;
    store.retry(messageId);
  }, [desktop, store]);
  const state = useThreadState(store);
  const busy =
    state.status === "submitted" ||
    state.status === "streaming" ||
    state.status === "stopping";

  return (
    <MessageScrollerProvider autoScroll scrollPreviousItemPeek={64}>
      <MessageScroller>
        <MessageScrollerViewport className="px-4 sm:px-8">
          <MessageScrollerContent
            aria-busy={busy}
            className="mx-auto w-full max-w-[883.2px] gap-8 px-4 py-6"
          >
            {state.messages.map((message) => (
              <ThreadMessage
                key={message.id}
                message={message}
                streaming={busy && message.state === "streaming"}
                onRetry={onRetry}
                retryDisabled={busy || desktopBusy || store.appendOnly === true}
                onEdit={onEditMessage}
              />
            ))}
            {store.appendOnly && !busy && state.messages.length > 0 ? (
              <p className="text-xs text-muted-foreground">需要重新尝试时，请发送一条新消息继续。</p>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
