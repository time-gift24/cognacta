"use client";

import { Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/beui/utils";

const sourceFiles = [
  {
    label: "PDF",
    imageUrl: "https://api.iconify.design/vscode-icons:file-type-pdf2.svg",
    className: "left-0 top-[26%] -rotate-6",
    photo: false,
  },
  {
    label: "XLS",
    imageUrl: "https://api.iconify.design/vscode-icons:file-type-excel.svg",
    className: "left-[27%] top-[4%] -rotate-1",
    photo: false,
  },
  {
    label: "JPG",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=160&q=80",
    className: "right-0 top-[24%] rotate-6",
    photo: true,
  },
] as const;

const pdfIconUrl = "https://api.iconify.design/vscode-icons:file-type-pdf2.svg";
const markdownIconUrl =
  "https://api.iconify.design/vscode-icons:file-type-markdown.svg";

export type FileFlowLayout = "default" | "card";

export type FileFlowProps = {
  className?: string;
  layout?: FileFlowLayout;
  title?: string;
};

export function FileFlow({
  className,
  layout = "default",
  title = "Source files move through a conversion step and become a ready document",
}: FileFlowProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "file-flow relative isolate flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_17%_50%,rgba(239,68,68,0.12),transparent_26%),radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.11),transparent_24%),radial-gradient(circle_at_84%_50%,rgba(34,197,94,0.1),transparent_26%)] dark:opacity-60"
      />

      <div
        aria-hidden="true"
        className={cn(
          "relative w-[88%] max-w-[31rem] [container-type:inline-size]",
          layout === "card" ? "h-[48%]" : "h-[52%]",
        )}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full text-border"
          viewBox="0 0 520 220"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M112 110 H408"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 7"
            strokeLinecap="round"
          />
          <path
            d="M112 110 H408"
            pathLength="100"
            className="file-flow__signal text-foreground"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute top-1/2 left-0 z-10 h-full w-[30%] -translate-y-1/2">
          {sourceFiles.map(
            ({ className: position, imageUrl, label, photo }) => (
              <div
                key={label}
                className={cn(
                  "absolute flex aspect-[0.82] w-[47%] flex-col overflow-hidden rounded-xl border border-white/80 bg-white p-1.5 text-neutral-900 dark:border-white/20 dark:bg-neutral-100",
                  position,
                  label === "PDF" && "file-flow__source-active",
                )}
              >
                <div
                  className={cn(
                    "flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-neutral-100",
                    photo && "bg-neutral-200",
                  )}
                >
                  {/* biome-ignore lint/performance/noImgElement: file artwork is loaded from stable image and icon assets. */}
                  <img
                    src={imageUrl}
                    alt=""
                    aria-hidden="true"
                    className={cn(
                      photo
                        ? "h-full w-full object-cover"
                        : layout === "card"
                          ? "size-5 object-contain"
                          : "size-7 object-contain",
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "pt-1 text-center font-mono text-neutral-500",
                    layout === "card" ? "text-[6px]" : "text-[8px]",
                  )}
                >
                  {label}
                </span>
              </div>
            ),
          )}
        </div>

        <div
          className={cn(
            "absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-border bg-background",
            layout === "card" ? "size-16 gap-1" : "size-24 gap-1.5",
          )}
        >
          <span
            className={cn(
              "file-flow__processor-ring flex items-center justify-center rounded-full bg-[conic-gradient(from_45deg,rgba(59,130,246,0.85),rgba(34,211,238,0.3),rgba(59,130,246,0.85))] p-px",
              layout === "card" ? "size-9" : "size-12",
            )}
          >
            <span className="flex size-full items-center justify-center rounded-full bg-background text-foreground">
              <RefreshCw
                aria-hidden="true"
                className={cn(
                  "file-flow__processor",
                  layout === "card" ? "size-3.5" : "size-5",
                )}
                strokeWidth={1.8}
              />
            </span>
          </span>
          <span
            className={cn(
              "font-medium",
              layout === "card" ? "text-[8px]" : "text-[10px]",
            )}
          >
            Convert
          </span>
        </div>

        <div
          className={cn(
            "file-flow__output absolute top-1/2 right-0 z-10 w-[28%] -translate-y-1/2 overflow-hidden rounded-xl border border-[rgba(59,130,246,0.2)] bg-[linear-gradient(145deg,rgba(59,130,246,0.14),rgba(255,255,255,0.96)_58%)] dark:bg-[linear-gradient(145deg,rgba(59,130,246,0.2),rgba(20,20,22,0.96)_62%)]",
            layout === "card" ? "p-2" : "p-3",
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-black/20",
                layout === "card" ? "size-7" : "size-9",
              )}
            >
              {/* biome-ignore lint/performance/noImgElement: the Markdown mark is a lightweight file-type asset. */}
              <img
                src={markdownIconUrl}
                alt=""
                aria-hidden="true"
                className={layout === "card" ? "size-4" : "size-5"}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate font-medium",
                  layout === "card" ? "text-[8px]" : "text-[10px]",
                )}
              >
                brief.md
              </span>
              <span
                className={cn(
                  "block text-muted-foreground",
                  layout === "card" ? "text-[6px]" : "text-[8px]",
                )}
              >
                Markdown
              </span>
            </span>
          </div>

          <div
            className={cn("grid gap-1", layout === "card" ? "mt-2" : "mt-3")}
          >
            <span className="h-1 rounded-full bg-[rgba(59,130,246,0.22)]" />
            <span className="h-1 w-[82%] rounded-full bg-foreground/10" />
            <span className="h-1 w-[58%] rounded-full bg-foreground/10" />
          </div>

          <div
            className={cn(
              "mt-2 flex items-center gap-1.5 border-[rgba(59,130,246,0.14)] border-t pt-2 text-[rgb(22,163,74)] dark:text-[rgb(74,222,128)]",
              layout === "card" ? "text-[6px]" : "text-[8px]",
            )}
          >
            <span
              className={cn(
                "file-flow__complete flex items-center justify-center rounded-full border border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.12)] text-[rgb(22,163,74)] dark:text-[rgb(74,222,128)]",
                layout === "card" ? "size-3.5" : "size-4",
              )}
            >
              <Check
                aria-hidden="true"
                className={layout === "card" ? "size-2" : "size-2.5"}
                strokeWidth={2}
              />
            </span>
            Ready to use
          </div>
        </div>

        <div className="file-flow__packet file-flow__packet--input absolute top-[26%] left-0 z-30 flex aspect-[0.82] w-[14.1%] origin-center -rotate-6 flex-col overflow-hidden rounded-xl border border-white/80 bg-white p-1.5 text-neutral-900 dark:border-white/20 dark:bg-neutral-100">
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg bg-neutral-100">
            {/* biome-ignore lint/performance/noImgElement: the PDF mark is a lightweight file-type asset. */}
            <img
              src={pdfIconUrl}
              alt=""
              aria-hidden="true"
              className={layout === "card" ? "size-5" : "size-7"}
            />
          </div>
          <span
            className={cn(
              "file-flow__packet-label pt-1 text-center font-mono text-neutral-500",
              layout === "card" ? "text-[6px]" : "text-[8px]",
            )}
          >
            PDF
          </span>
        </div>

        <div
          className={cn(
            "file-flow__packet file-flow__packet--output absolute top-1/2 left-[51%] z-30 flex -translate-y-1/2 items-center justify-center rounded-lg border border-[rgba(59,130,246,0.22)] bg-white text-muted-foreground dark:bg-neutral-100",
            layout === "card" ? "size-9" : "size-12",
          )}
        >
          {/* biome-ignore lint/performance/noImgElement: the Markdown mark is a lightweight file-type asset. */}
          <img
            src={markdownIconUrl}
            alt=""
            aria-hidden="true"
            className={layout === "card" ? "size-5" : "size-7"}
          />
        </div>
      </div>

      <style>{`
        .file-flow__signal {
          stroke-dasharray: 2 98;
          animation: file-flow-signal 8s linear infinite;
          will-change: stroke-dashoffset, opacity;
        }

        .file-flow__source-active {
          animation: file-flow-source 8s cubic-bezier(0.23, 1, 0.32, 1) infinite;
          will-change: opacity, filter;
        }

        .file-flow__processor-ring {
          animation: file-flow-ring 8s cubic-bezier(0.77, 0, 0.175, 1)
            infinite;
          will-change: opacity, transform;
        }

        .file-flow__packet--input {
          animation: file-flow-input 8s cubic-bezier(0.77, 0, 0.175, 1)
            infinite;
          will-change: opacity, transform;
        }

        .file-flow__packet-label {
          animation: file-flow-packet-label 8s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          will-change: opacity;
        }

        .file-flow__packet--output {
          animation: file-flow-output 8s cubic-bezier(0.77, 0, 0.175, 1)
            infinite;
          will-change: opacity, transform;
        }

        .file-flow__processor {
          animation: file-flow-process 8s cubic-bezier(0.77, 0, 0.175, 1)
            infinite;
          will-change: transform;
        }

        .file-flow__output {
          animation: file-flow-output-card 8s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          will-change: opacity;
        }

        .file-flow__complete {
          animation: file-flow-complete 8s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          will-change: opacity, transform;
        }

        @keyframes file-flow-signal {
          0% {
            opacity: 0;
            stroke-dashoffset: 100;
          }
          12%,
          82% {
            opacity: 0.5;
          }
          100% {
            opacity: 0;
            stroke-dashoffset: 0;
          }
        }

        @keyframes file-flow-source {
          0%,
          8%,
          44%,
          100% {
            opacity: 1;
            filter: saturate(1);
          }
          13%,
          38% {
            opacity: 0;
            filter: saturate(1.15);
          }
        }

        @keyframes file-flow-ring {
          0%,
          27%,
          60%,
          100% {
            opacity: 0.65;
            transform: scale(0.96);
          }
          35%,
          53% {
            opacity: 1;
            transform: scale(1.06);
          }
        }

        @keyframes file-flow-input {
          0%,
          8% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(-6deg) scale(1);
          }
          12% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotate(-6deg) scale(1);
          }
          34% {
            opacity: 1;
            transform: translate3d(43cqw, 12%, 0) rotate(0deg) scale(0.62);
          }
          39%,
          100% {
            opacity: 0;
            transform: translate3d(43cqw, 12%, 0) rotate(0deg) scale(0.62);
          }
        }

        @keyframes file-flow-packet-label {
          0%,
          17%,
          100% {
            opacity: 1;
          }
          25%,
          42% {
            opacity: 0;
          }
        }

        @keyframes file-flow-output {
          0%,
          49% {
            opacity: 0;
            transform: translate3d(0, -50%, 0) scale(0.92);
          }
          55% {
            opacity: 1;
            transform: translate3d(0, -50%, 0) scale(1);
          }
          74% {
            opacity: 1;
            transform: translate3d(24cqw, -50%, 0) scale(0.96);
          }
          79%,
          100% {
            opacity: 0;
            transform: translate3d(24cqw, -50%, 0) scale(0.96);
          }
        }

        @keyframes file-flow-process {
          0%,
          31% {
            transform: rotate(0deg);
          }
          52%,
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes file-flow-output-card {
          0%,
          66%,
          100% {
            opacity: 0.55;
          }
          74%,
          91% {
            opacity: 1;
          }
        }

        @keyframes file-flow-complete {
          0%,
          66%,
          100% {
            opacity: 0.55;
            transform: scale(0.96);
          }
          74%,
          91% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .file-flow__signal,
          .file-flow__source-active,
          .file-flow__processor-ring,
          .file-flow__packet,
          .file-flow__packet-label,
          .file-flow__processor,
          .file-flow__output,
          .file-flow__complete {
            animation: none;
          }

          .file-flow__packet {
            display: none;
          }

          .file-flow__output,
          .file-flow__complete {
            opacity: 1;
          }

          .file-flow__complete {
            transform: none;
          }

          .file-flow__signal {
            opacity: 0.4;
            stroke-dasharray: 2 12;
          }
        }
      `}</style>
    </div>
  );
}
