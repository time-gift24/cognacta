"use client";

import * as React from "react";
import {
  Streamdown,
  defaultRehypePlugins,
  useIsCodeFenceIncomplete,
  type AnimateOptions,
  type ExtraProps,
} from "streamdown";

import { useHighlightedCode } from "@/hooks/use-highlighted-code";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import { cn } from "@/lib/utils";

function MarkdownCodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const incomplete = useIsCodeFenceIncomplete();
  const lines = useHighlightedCode(code, language);

  return (
    <CodeBlock className="my-4">
      <CodeBlockHeader>
        <CodeBlockTitle>{language || "text"}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} disabled={incomplete} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}

function MarkdownCode({
  className,
  children,
  ...props
}: React.ComponentProps<"code"> & ExtraProps) {
  // Streamdown marks fenced code with data-block. Everything else is inline.
  if (!("data-block" in props)) {
    return (
      <code
        className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.875em]"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <MarkdownCodeBlock
      code={typeof children === "string" ? children : ""}
      language={/language-(\S+)/.exec(className ?? "")?.[1] ?? ""}
    />
  );
}

const components = { code: MarkdownCode };
const streamingAnimation: AnimateOptions = {
  animation: "chat-text-reveal",
  duration: 280,
  easing: "ease-out",
  sep: "char",
  // 同一批新增文字同时渐显，突发大段内容不排队延迟显示。
  stagger: 0,
};

export function Markdown({
  children,
  className,
  streaming = false,
  linkBase,
  componentOverrides,
}: {
  children: string;
  className?: string;
  streaming?: boolean;
  /** Resolve document-relative links without changing the stored Markdown. */
  linkBase?: string;
  componentOverrides?: React.ComponentProps<typeof Streamdown>["components"];
}) {
  const rehypePlugins = React.useMemo(
    () =>
      linkBase
        ? (Object.entries(defaultRehypePlugins).map(([name, plugin]) =>
            name === "harden" && Array.isArray(plugin)
              ? [plugin[0], { ...plugin[1], defaultOrigin: linkBase }]
              : plugin,
          ) as React.ComponentProps<typeof Streamdown>["rehypePlugins"])
        : undefined,
    [linkBase],
  );
  return (
    <Streamdown
      key={linkBase}
      className={cn("chat-markdown", className)}
      components={{ ...components, ...componentOverrides }}
      rehypePlugins={rehypePlugins}
      animated={streaming ? streamingAnimation : false}
      isAnimating={streaming}
    >
      {children}
    </Streamdown>
  );
}
