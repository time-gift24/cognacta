"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CheckIcon,
  StopIcon,
} from "@hugeicons-pro/core-stroke-rounded";

import type { MessageState, PartView, ToolState } from "@/chat/fold.ts";
import {
  Trace,
  TraceDisclosure,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block";
import { Markdown } from "@/components/chat/markdown";
import {
  AIThinkingLoader,
  type AIThinkingLoaderVariant,
} from "@/components/premium/ai-thinking-loader";

const TOOL_VERBS: Record<string, string> = {
  readBuildLog: "读取构建日志",
  searchCode: "搜索代码",
  searchWeb: "搜索网页",
};

const detailSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});
const TOOL_DETAIL_KEYS = [
  "title",
  "description",
  "objective",
  "task",
  "command",
  "cmd",
  "query",
  "queries",
  "pattern",
  "file_path",
  "path",
  "url",
  "uri",
  "deployment",
];

function shortDetail(text: string): string {
  const characters: string[] = [];
  for (const { segment } of detailSegmenter.segment(text.replace(/\s+/g, " ").trim())) {
    characters.push(segment);
    if (characters.length > 80) return `${characters.slice(0, 79).join("")}…`;
  }
  return characters.join("");
}

function toolDetail(inputText: string): string {
  let input: unknown;
  try {
    input = JSON.parse(inputText);
  } catch {
    // 参数尚未接收完整时保持动作名，不把半截 JSON 当作详情。
    return "";
  }
  if (input === null || typeof input !== "object" || Array.isArray(input))
    return "";
  for (const key of TOOL_DETAIL_KEYS) {
    const value: unknown = Reflect.get(input, key);
    const text =
      typeof value === "string"
        ? value
        : Array.isArray(value) &&
            value.every((item) => typeof item === "string")
          ? value.join(", ")
          : "";
    const detail = shortDetail(text);
    if (detail) return detail;
  }
  return "";
}

function reasoningPreview(text: string, running: boolean): string {
  const lines = text.trimStart().split(/\r?\n/);
  let preview = lines[0] ?? "";
  if (running) {
    lines.pop(); // 未收到换行的首行仍在生成，不随每个 token 改写摘要。
    preview = "";
    let paragraphStart = true;
    for (const line of lines) {
      if (!line.trim()) paragraphStart = true;
      else if (paragraphStart) {
        preview = line;
        paragraphStart = false;
      }
    }
  }
  return shortDetail(preview.replaceAll("**", "").replace(/^#{1,6}\s+/, ""));
}

function StepTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <TraceTitle>
      {title}
      {detail && (
        <span
          data-slot="trace-detail"
          className="font-normal text-muted-foreground/75"
        >{` · ${detail}`}</span>
      )}
    </TraceTitle>
  );
}

function StatusIcon({
  status,
  variant = "orbit",
}: {
  status?: "running" | "error" | "pending";
  variant?: AIThinkingLoaderVariant;
}) {
  if (status === "running") {
    return (
      <AIThinkingLoader
        variant={variant}
        label=""
        className="[&>svg]:size-4"
      />
    );
  }
  return (
    <HugeiconsIcon
      icon={
        status === "error"
          ? AlertCircleIcon
          : status === "pending"
            ? StopIcon
            : CheckIcon
      }
      className="size-3.5"
    />
  );
}

function stepStatus(state: ToolState, messageState: MessageState) {
  if (state !== "running") return state === "error" ? "error" : undefined;
  if (messageState === "streaming") return "running";
  return messageState === "failed" ? "error" : "pending";
}

function toolTitle(
  name: string,
  state: ToolState,
  messageState: MessageState,
): string {
  const verb = Object.hasOwn(TOOL_VERBS, name)
    ? TOOL_VERBS[name]
    : `执行 ${name || "工具"}`;
  if (state === "running") {
    if (messageState === "streaming") return `正在${verb}…`;
    if (messageState === "failed") return `${verb}中断`;
    return messageState === "stopped" ? `已停止${verb}` : `${verb}已结束`;
  }
  if (state === "error") return `${verb}失败`;
  return `已${verb}`;
}

const ToolStep = React.memo(function ToolStep({
  part,
  messageState,
}: {
  part: Extract<PartView, { kind: "tool" }>;
  messageState: MessageState;
}) {
  const status = stepStatus(part.state, messageState);

  const detail =
    part.state === "error" && part.errorText ? (
      <CodeBlock variant="destructive">
        <CodeBlockContent wrap className="max-h-64">
          {part.errorText}
        </CodeBlockContent>
      </CodeBlock>
    ) : part.output !== undefined ? (
      <CodeBlock>
        <CodeBlockContent wrap className="max-h-64">
          {typeof part.output === "string"
            ? part.output
            : JSON.stringify(part.output, null, 2)}
        </CodeBlockContent>
      </CodeBlock>
    ) : null;

  const line = (
    <TraceLine status={status}>
      <TraceIcon>
        <StatusIcon status={status} variant="scan" />
      </TraceIcon>
      <StepTitle
        title={toolTitle(part.name, part.state, messageState)}
        detail={toolDetail(part.inputText)}
      />
    </TraceLine>
  );

  if (!detail) return line;

  return (
    <TraceDisclosure title={line} defaultOpen={part.state === "error"}>
      {detail}
    </TraceDisclosure>
  );
});

function ReasoningStep({
  part,
  messageState,
}: {
  part: Extract<PartView, { kind: "reasoning" }>;
  messageState: MessageState;
}) {
  const [open, setOpen] = React.useState(false);
  const status = stepStatus(part.state, messageState);
  let title = "已思考";
  if (status === "running") title = "正在思考…";
  if (status === "error") title = "思考中断";
  if (status === "pending") {
    title = messageState === "stopped" ? "思考已停止" : "思考已结束";
  }
  const line = (
    <TraceLine status={status}>
      <TraceIcon>
        <StatusIcon status={status} variant="diamond" />
      </TraceIcon>
      <StepTitle
        title={title}
        detail={open ? "" : reasoningPreview(part.text, status === "running")}
      />
    </TraceLine>
  );
  if (!part.text) return line;
  return (
    <TraceDisclosure title={line} open={open} onOpenChange={setOpen}>
      <Markdown
        streaming={status === "running"}
        className="text-sm text-muted-foreground"
      >
        {part.text}
      </Markdown>
    </TraceDisclosure>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 1) return "不足 1 秒";
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}

export function ChainOfThought({
  parts,
  streaming,
  answering,
  messageState = streaming ? "streaming" : "done",
}: {
  parts: PartView[];
  streaming: boolean;
  messageState?: MessageState;
  /** 正文已开始输出。 */
  answering: boolean;
}) {
  const [open, setOpen] = React.useState<boolean>();
  const unfinished = parts.some(
    (part) => part.kind !== "text" && part.state === "running",
  );
  const settled = !streaming || (!unfinished && answering);
  const running = !settled;
  const interrupted = !streaming && unfinished;
  const expanded = open ?? (streaming && !answering);
  const failed = parts.filter(
    (part) =>
      part.kind !== "text" && stepStatus(part.state, messageState) === "error",
  ).length;
  const status = running
    ? "running"
    : failed > 0
      ? "error"
      : interrupted
        ? "pending"
        : undefined;

  // 耗时包含步骤间隙，不计后续正文；重挂载后丢失。
  const startedAt = React.useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!settled) {
      if (startedAt.current === null) {
        startedAt.current = Date.now();
        setElapsedMs(null);
      }
    } else if (startedAt.current !== null) {
      setElapsedMs(Date.now() - startedAt.current);
      startedAt.current = null;
    }
  }, [settled]);

  let summary = `已研究 ${parts.length} 步${failed > 0 ? `，${failed} 步失败` : ""}`;
  let summaryDetail = "";
  for (let index = parts.length - 1; index >= 0 && !summaryDetail; index--) {
    const part = parts[index];
    if (part.kind === "tool") summaryDetail = toolDetail(part.inputText);
    else if (part.kind === "reasoning")
      summaryDetail = reasoningPreview(part.text, false);
  }
  if (running) {
    const tool = parts.findLast(
      (part) => part.kind === "tool" && part.state === "running",
    );
    const reasoning = parts.findLast(
      (part) => part.kind === "reasoning" && part.state === "running",
    );
    if (tool?.kind === "tool") {
      summary = toolTitle(tool.name, tool.state, messageState);
      summaryDetail = toolDetail(tool.inputText);
    } else if (reasoning?.kind === "reasoning") {
      summary = "正在思考…";
      summaryDetail = reasoningPreview(reasoning.text, true);
    } else summary = "正在等待回复…";
  } else if (interrupted) {
    summary = "研究已结束";
    if (messageState === "failed") summary = "研究中断";
    if (messageState === "stopped") summary = "研究已停止";
  }
  if (!running && elapsedMs !== null) {
    summary += ` · 用时 ${formatDuration(elapsedMs)}`;
  }

  return (
    <Trace>
      <TraceDisclosure
        open={expanded}
        onOpenChange={setOpen}
        onFocusCapture={() => setOpen(true)}
        // 步骤多时限制展开区高度并在内部滚动，避免摘要行被撑出视口、只能滚整条线程。
        contentClassName="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain scroll-fade-y scrollbar-thin scrollbar-gutter-stable"
        title={
          <TraceLine status={status}>
            <TraceIcon>
              <StatusIcon status={status} />
            </TraceIcon>
            <StepTitle title={summary} detail={expanded ? "" : summaryDetail} />
          </TraceLine>
        }
      >
        <Trace>
          {parts.map((part, index) =>
            part.kind === "reasoning" ? (
              <ReasoningStep
                key={index}
                part={part}
                messageState={messageState}
              />
            ) : part.kind === "tool" ? (
              <ToolStep key={index} part={part} messageState={messageState} />
            ) : null,
          )}
        </Trace>
      </TraceDisclosure>
    </Trace>
  );
}
