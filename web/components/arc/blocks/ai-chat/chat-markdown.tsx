"use client";

import { memo } from "react";
import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "../../copy-button/copy-button";
import { HoverCard } from "../../hover-card/hover-card";
import type { ChatSource } from "./chat-data";
import styles from "./chat.module.css";

/*
 * A small markdown reader for chat answers: paragraphs, ordered and bulleted lists, short headings, fenced code, **bold**,
 * `inline code` and [1] citations. Every text run keeps its offset in the source, so streamed text can be split at the
 * chunk boundaries the reveal clock produced. Each chunk is its own span keyed by where it starts: it mounts once and
 * fades in once, and nothing that is already on screen re-renders or reflows. Settled text renders as plain strings.
 */

type Run = { text: string; start: number; strong: boolean; code: boolean };
type Cite = { cite: number; start: number };
type Segment = Run | Cite;
export type Block =
  | { kind: "p" | "h"; start: number; segments: Segment[] }
  | { kind: "ol" | "ul"; start: number; first: number; items: { start: number; segments: Segment[] }[] }
  | { kind: "code"; start: number; lang: string; code: string; codeStart: number; closed: boolean };

function inline(line: string, offset: number, into: Segment[]) {
  let strong = false, code = false, buffer = "", bufferStart = offset;
  const flush = (next: number) => {
    if (buffer) into.push({ text: buffer, start: bufferStart, strong, code });
    buffer = "";
    bufferStart = next;
  };
  for (let i = 0; i < line.length;) {
    if (!code && line.startsWith("**", i)) { flush(offset + i + 2); strong = !strong; i += 2; continue; }
    if (line[i] === "`") { flush(offset + i + 1); code = !code; i += 1; continue; }
    if (!code && line[i] === "[") {
      const match = /^\[(\d{1,2})\]/.exec(line.slice(i, i + 5));
      if (match) { flush(offset + i + match[0].length); into.push({ cite: Number(match[1]), start: offset + i }); i += match[0].length; continue; }
    }
    if (!buffer) bufferStart = offset + i;
    buffer += line[i];
    i += 1;
  }
  flush(offset + line.length);
}

const LIST = /^(\s*)(\d+\.|[-*])\s+/;
const HEADING = /^#{1,4}\s+/;
const FENCE = /^\s*```/;

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split("\n");
  const offsets: number[] = [];
  lines.reduce((at, line) => { offsets.push(at); return at + line.length + 1; }, 0);
  let paragraph: Extract<Block, { kind: "p" | "h" }> | null = null;
  let list: Extract<Block, { kind: "ol" | "ul" }> | null = null;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i], at = offsets[i];
    if (FENCE.test(line)) {
      paragraph = null; list = null;
      const lang = line.trim().slice(3).trim();
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== "```") body.push(lines[j++]);
      blocks.push({ kind: "code", start: at, lang, code: body.join("\n"), codeStart: offsets[i + 1] ?? source.length, closed: j < lines.length });
      i = j + 1;
      continue;
    }
    if (!line.trim()) { paragraph = null; list = null; i += 1; continue; }
    const item = LIST.exec(line);
    if (item) {
      paragraph = null;
      const kind = item[2].endsWith(".") ? "ol" : "ul";
      if (!list || list.kind !== kind) { list = { kind, start: at, first: kind === "ol" ? parseInt(item[2], 10) : 1, items: [] }; blocks.push(list); }
      const segments: Segment[] = [];
      inline(line.slice(item[0].length), at + item[0].length, segments);
      list.items.push({ start: at, segments });
      i += 1;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      list = null;
      paragraph = { kind: "h", start: at, segments: [] };
      inline(line.slice(heading[0].length), at + heading[0].length, paragraph.segments);
      blocks.push(paragraph);
      paragraph = null;
      i += 1;
      continue;
    }
    // A plain line after a list item continues that item; otherwise it continues or opens a paragraph.
    const target = list ? list.items[list.items.length - 1].segments : paragraph?.segments;
    if (target) {
      target.push({ text: " ", start: at - 1, strong: false, code: false });
      inline(line.trim(), at + (line.length - line.trimStart().length), target);
    } else {
      paragraph = { kind: "p", start: at, segments: [] };
      inline(line, at, paragraph.segments);
      blocks.push(paragraph);
    }
    i += 1;
  }
  return blocks;
}

/* The reveal clock ------------------------------------------------------------------------------------------------ */

const isSpace = (char: string | undefined) => char === " " || char === "\n" || char === "\t";

function wordEnd(text: string, from: number) {
  let i = from;
  while (i < text.length && isSpace(text[i])) i += 1;
  while (i < text.length && !isSpace(text[i])) i += 1;
  return i;
}

/**
 * Where the next chunk ends: `words` whole words after `from`. A word still arriving waits for the next tick, a code
 * fence shows as a whole line, and a list marker or heading mark never shows without its first word, so no block
 * changes shape after it appears.
 */
export function nextCut(text: string, from: number, words: number, final: boolean): number {
  let i = from;
  for (let n = 0; n < words && i < text.length; n += 1) i = wordEnd(text, i);
  if (i >= text.length && !final) {
    let j = text.length;
    while (j > from && !isSpace(text[j - 1])) j -= 1;
    i = j;
  }
  if (i <= from) return from;
  for (let guard = 0; guard < 4; guard += 1) {
    const lineStart = text.lastIndexOf("\n", i - 1) + 1;
    const newline = text.indexOf("\n", lineStart);
    const lineEnd = newline === -1 ? text.length : newline;
    if (FENCE.test(text.slice(lineStart, lineEnd))) {
      if (newline !== -1) return Math.max(i, newline + 1);
      return final ? text.length : Math.max(from, lineStart);
    }
    if (/^\s*(\d+\.|[-*]|#{1,4})\s*$/.test(text.slice(lineStart, i))) {
      const end = wordEnd(text, i);
      if (end >= text.length && !final) return Math.max(from, lineStart);
      i = end;
      continue;
    }
    break;
  }
  return i;
}

/** Markdown to plain text for copying: citations and markers drop out. */
export function plainText(markdown: string) {
  return markdown.replace(/ ?\[\d{1,2}\]/g, "").replace(/\*\*/g, "").replace(/`(?!``)/g, "").trim();
}

export const domainOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/* Rendering ------------------------------------------------------------------------------------------------------- */

/** Splits one text run at the chunk starts inside it. Each piece is keyed by its source offset, so it mounts once. */
function pieces(text: string, start: number, marks: number[] | undefined, render: (value: string) => ReactNode = value => value): ReactNode {
  if (!marks) return render(text);
  const end = start + text.length;
  const out: ReactNode[] = [];
  let from = start;
  for (const mark of marks) {
    if (mark <= from) continue;
    if (mark >= end) break;
    out.push(<span key={from} className={styles.chunk}>{render(text.slice(from - start, mark - start))}</span>);
    from = mark;
  }
  out.push(<span key={from} className={styles.chunk}>{render(text.slice(from - start))}</span>);
  return out;
}

const SQL = /\b(SELECT|FROM|WHERE|AND|OR|NOT|NULL|IS|ALTER|TABLE|ADD|COLUMN|CONSTRAINT|CHECK|VALID|VALIDATE|SET|DROP|UPDATE|INSERT|INTO|VALUES|CREATE|INDEX|CONCURRENTLY|ON|AS|IN|BEGIN|COMMIT|text|bigint|integer|count|now)\b|('[^']*')|(\$\d+|\b\d[\d_]*\b)|(--.*$)/gm;

/** A light pass that tints keywords, strings and numbers. It runs per piece, and pieces always end between words. */
function highlight(value: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of value.matchAll(SQL)) {
    const at = match.index ?? 0;
    if (at > last) out.push(value.slice(last, at));
    const tone = match[1] ? styles.tokKeyword : match[2] ? styles.tokString : match[3] ? styles.tokNumber : styles.tokComment;
    out.push(<span key={at} className={tone}>{match[0]}</span>);
    last = at + match[0].length;
  }
  if (last < value.length) out.push(value.slice(last));
  return out.length === 1 ? out[0] : out;
}

function SourcePreview({ source, n }: { source: ChatSource; n: number }) {
  const Mark = source.mark;
  return <div className={styles.sourcePreview}>
    <p className={styles.sourceSite}>
      {Mark ? <Mark className={styles.sourceMark} style={{ color: source.color }} aria-hidden="true" /> : <Globe className={styles.sourceMark} size={14} strokeWidth={1.75} aria-hidden="true" />}
      <span>{domainOf(source.url)}</span>
      <span className={styles.sourceN}>{n}</span>
    </p>
    <p className={styles.sourceTitle}>{source.title}</p>
    {source.snippet && <p className={styles.sourceSnippet}>{source.snippet}</p>}
  </div>;
}

function CiteChip({ n, source, fresh }: { n: number; source?: ChatSource; fresh: boolean }) {
  const t = useTranslations("ArcChat");
  const className = [styles.cite, fresh ? styles.chunk : ""].filter(Boolean).join(" ");
  if (!source) return <span className={className} data-missing="">{n}</span>;
  return <HoverCard side="top" align="center" openDelay={220} className={styles.sourceCard} content={<SourcePreview source={source} n={n} />}>
    <a className={className} href={source.url} target="_blank" rel="noreferrer" aria-label={t("sourceLabel", { index: n, title: source.title, domain: domainOf(source.url) })}>{n}</a>
  </HoverCard>;
}

function Segments({ segments, marks, sources }: { segments: Segment[]; marks?: number[]; sources: ChatSource[] }) {
  return segments.map(segment => {
    if ("cite" in segment) return <CiteChip key={`c${segment.start}`} n={segment.cite} source={sources[segment.cite - 1]} fresh={!!marks} />;
    const body = pieces(segment.text, segment.start, marks);
    if (segment.code) return <code key={segment.start} className={styles.inlineCode}>{body}</code>;
    if (segment.strong) return <strong key={segment.start} className={styles.strong}>{body}</strong>;
    return <span key={segment.start}>{body}</span>;
  });
}

function CodeBlock({ block, marks }: { block: Extract<Block, { kind: "code" }>; marks?: number[] }) {
  const t = useTranslations("ArcChat");
  return <div className={[styles.codeBlock, marks ? styles.chunk : ""].filter(Boolean).join(" ")}>
    <div className={styles.codeHead}>
      <span className={styles.codeLang}>{block.lang || "code"}</span>
      <CopyButton value={block.code} label={t("copyCode")} variant="plain" className={styles.codeCopy} disabled={!block.closed} />
    </div>
    <pre className={styles.codePre}><code>{pieces(block.code, block.codeStart, marks, highlight)}</code></pre>
  </div>;
}

export interface MarkdownProps {
  source: string;
  /** Characters of `source` on screen. Defaults to all of it. */
  shown?: number;
  /** Chunk start offsets while streaming; leave undefined for settled text. */
  marks?: number[];
  sources?: ChatSource[];
}

export const Markdown = memo(function Markdown({ source, shown, marks, sources = [] }: MarkdownProps) {
  const blocks = parseMarkdown(shown === undefined ? source : source.slice(0, shown));
  return <div className={styles.markdown}>
    {blocks.map(block => {
      if (block.kind === "code") return <CodeBlock key={`code${block.start}`} block={block} marks={marks} />;
      if (!("items" in block)) return block.kind === "h"
        ? <h3 key={`h${block.start}`} className={styles.heading}><Segments segments={block.segments} marks={marks} sources={sources} /></h3>
        : <p key={`p${block.start}`} className={styles.paragraph}><Segments segments={block.segments} marks={marks} sources={sources} /></p>;
      const items = block.items.map(item => <li key={item.start} className={marks ? styles.chunk : undefined}><Segments segments={item.segments} marks={marks} sources={sources} /></li>);
      return block.kind === "ol"
        ? <ol key={`ol${block.start}`} className={styles.list} start={block.first !== 1 ? block.first : undefined}>{items}</ol>
        : <ul key={`ul${block.start}`} className={styles.list}>{items}</ul>;
    })}
  </div>;
});
