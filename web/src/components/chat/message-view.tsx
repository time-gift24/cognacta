"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CheckIcon,
  Copy01Icon,
  PencilEdit01Icon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@hugeicons-pro/core-stroke-rounded";

import type { ChatMessageView } from "@/chat/fold.ts";
import { segmentAssistantParts } from "@/chat/fold.ts";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Markdown } from "@/components/chat/markdown";
import { ChainOfThought } from "@/components/chat/chain-of-thought";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/motion/button";
import { Message, MessageContent, MessageFooter } from "@/components/ui/message";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function MessageAction({
  label,
  pressed,
  disabled,
  copied,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  copied?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          data-copied={copied || undefined}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function messageText(message: ChatMessageView): string {
  return message.parts
    .filter((part) => part.kind === "text")
    .map((part) => part.text)
    .join(message.role === "assistant" ? "\n\n" : "");
}

function CopyMessageAction({ text }: { text: string }) {
  const { status, copy } = useCopyToClipboard();
  const copied = status === "copied";
  const failed = status === "error";
  return (
    <>
      <MessageAction
        label={failed ? "复制失败，点击重试" : copied ? "已复制" : status === "pending" ? "复制中…" : "复制"}
        disabled={status === "pending"}
        copied={copied}
        onClick={() => void copy(text)}
      >
        <HugeiconsIcon
          key={status}
          icon={failed ? AlertCircleIcon : copied ? CheckIcon : Copy01Icon}
          className={copied ? "chat-check-decay size-4" : "size-4"}
        />
      </MessageAction>
      <span role="status" className={failed ? "text-xs text-destructive" : "sr-only"}>
        {failed ? "复制失败，请重试" : copied ? "已复制" : ""}
      </span>
    </>
  );
}

export function MessageView({
  message,
  streaming,
  onRetry,
  onEdit,
  retryDisabled = false,
}: {
  message: ChatMessageView;
  streaming: boolean;
  onRetry: () => void;
  retryDisabled?: boolean;
  /** 把用户消息文本放回输入框。 */
  onEdit?: (text: string) => void;
}) {
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);

  if (message.role === "user") {
    const text = messageText(message);
    return (
      <Message align="end" className="chat-bubble-enter">
        <MessageContent className="gap-2">
          <Bubble align="end" variant="muted">
            <BubbleContent className="whitespace-pre-wrap">{text}</BubbleContent>
            {message.attachments && message.attachments.length > 0 && (
              <ul
                aria-label="消息附件"
                className="mt-1.5 flex flex-wrap justify-end gap-1 border-t border-border/60 pt-1.5"
              >
                {message.attachments.map((attachment, index) => (
                  <li
                    key={`${attachment.name}-${index}`}
                    className="max-w-full truncate rounded-full bg-background/70 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {attachment.name}
                  </li>
                ))}
              </ul>
            )}
          </Bubble>
          <MessageFooter>
            <CopyMessageAction text={text} />
            {onEdit && (
              <MessageAction label="编辑" onClick={() => onEdit(text)}>
                <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
              </MessageAction>
            )}
          </MessageFooter>
        </MessageContent>
      </Message>
    );
  }

  const segments = segmentAssistantParts(message.parts);
  const text = messageText(message);
  // 每组步骤在后续正文出现时自动收起；活动组保持展开。
  const textAfter = segments.map((_, index) =>
    segments.slice(index + 1).some((segment) => segment.kind === "text"),
  );

  return (
    <Message className="chat-message-enter">
      <MessageContent className="gap-4">
        {segments.map((segment, index) =>
          segment.kind === "steps" ? (
            <ChainOfThought
              key={`steps-${index}`}
              parts={segment.parts}
              streaming={streaming && message.state === "streaming"}
              messageState={message.state}
              answering={textAfter[index]}
            />
          ) : (
            <Markdown key={`text-${index}`} streaming={streaming}>
              {segment.text}
            </Markdown>
          ),
        )}
        {message.state === "failed" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <HugeiconsIcon icon={AlertCircleIcon} className="size-4" />
            <span>回复中断，已保留已输出的内容。</span>
            <Button variant="ghost" size="sm" disabled={retryDisabled} onClick={onRetry}>
              <HugeiconsIcon icon={RefreshCcwIcon} className="size-4" />
              重试
            </Button>
          </div>
        )}
        {message.state === "stopped" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>已停止。</span>
            <Button variant="ghost" size="sm" disabled={retryDisabled} onClick={onRetry}>
              <HugeiconsIcon icon={RefreshCcwIcon} className="size-4" />
              重新生成
            </Button>
          </div>
        )}
        {message.state === "done" && (
          <MessageFooter className="px-0">
            <CopyMessageAction text={text} />
            <MessageAction
              label="回答有帮助"
              pressed={feedback === "up"}
              onClick={() => setFeedback(feedback === "up" ? null : "up")}
            >
              <HugeiconsIcon
                icon={ThumbsUpIcon}
                className={
                  feedback === "up" ? "size-4 fill-current" : "size-4"
                }
              />
            </MessageAction>
            <MessageAction
              label="回答无帮助"
              pressed={feedback === "down"}
              onClick={() => setFeedback(feedback === "down" ? null : "down")}
            >
              <HugeiconsIcon
                icon={ThumbsDownIcon}
                className={
                  feedback === "down" ? "size-4 fill-current" : "size-4"
                }
              />
            </MessageAction>
            <MessageAction label="重试" disabled={retryDisabled} onClick={onRetry}>
              <HugeiconsIcon icon={RefreshCcwIcon} className="size-4" />
            </MessageAction>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}
