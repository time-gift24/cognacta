"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionSwapIcon } from "@/components/beui/motion/action-swap";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";

export type DocsCodeBlockProps = {
  code: string;
  label?: string;
  /** Optional controls rendered in the header, such as package tabs. */
  header?: React.ReactNode;
  className?: string;
};

export function DocsCodeBlock({
  code,
  label,
  header,
  className,
}: DocsCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-background",
        className,
      )}
    >
      <div className="flex min-h-11 items-center justify-between gap-3 border-border border-b pr-1.5 pl-4">
        {header ?? (
          <span className="font-mono text-muted-foreground text-xs">
            {label}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          <ActionSwapIcon value={copied ? "copied" : "copy"}>
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
          </ActionSwapIcon>
        </Button>
        <span className="sr-only" aria-live="polite">
          {copied ? "Code copied" : ""}
        </span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-6">
        <code>
          {code.split("\n").map((line, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static code lines
              key={index}
              className={cn(
                "block",
                line.trimStart().startsWith("//") && "text-muted-foreground",
              )}
            >
              {line || " "}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
