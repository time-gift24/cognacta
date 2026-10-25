"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent, KeyboardEvent, ReactNode, RefObject } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Copy, Database, FileText, Globe, LoaderCircle, Paperclip, Search, Square, SquareTerminal, X } from "lucide-react";
import { TextShimmer } from "../../text-shimmer/text-shimmer";
import { Tooltip } from "../../tooltip/tooltip";
import type { AiChatAttachment, ChatModel, ChatSource, ChatTool } from "./chat-data";
import { domainOf } from "./chat-markdown";
import styles from "./chat.module.css";

type Bezier = [number, number, number, number];
const EASE: Bezier = [0.22, 1, 0.36, 1];
/** Critically damped: sizes and folds settle without overshoot. */
export const SETTLE = { type: "spring", visualDuration: 0.26, bounce: 0 } as const;
export const FOLD = { type: "spring", visualDuration: 0.32, bounce: 0 } as const;

const subscribe = () => () => {};
/** Reduced motion, false during server render so markup matches. */
export function useReduced() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return !!useReducedMotion() && hydrated;
}

export const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

/* Swaps ------------------------------------------------------------------------------------------------------------ */

/**
 * One minimal crossfade for a label: the old one fades out in 100ms while the new one fades in over 160ms from 2px
 * below. The box follows the measured width on a critically damped spring, so neighbours glide instead of jumping.
 */
export function Swap({ swapKey, children, reduced, className }: { swapKey: string; children: ReactNode; reduced: boolean; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const rest = useRef(0);
  const previous = useRef(swapKey);
  useLayoutEffect(() => {
    const node = box.current;
    if (!node || previous.current === swapKey) return;
    previous.current = swapKey;
    const from = node.style.width ? node.getBoundingClientRect().width : rest.current;
    node.style.width = "";
    const to = node.getBoundingClientRect().width;
    if (reduced || !from || Math.abs(from - to) < 1) return;
    const controls = animate(node, { width: [from, to] }, { ...SETTLE, onComplete: () => { node.style.width = ""; } });
    return () => controls.stop();
  }, [swapKey, reduced]);
  useEffect(() => {
    const node = box.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => { if (!node.style.width) rest.current = node.getBoundingClientRect().width; });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <span ref={box} className={cx(styles.swap, className)}>
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={swapKey} className={styles.swapItem}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.1, ease: EASE } }}
        transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}>{children}</motion.span>
    </AnimatePresence>
  </span>;
}

/** Icons trade places in a fixed cell with a plain crossfade. */
export function IconSwap({ swapKey, children, reduced, className }: { swapKey: string; children: ReactNode; reduced: boolean; className?: string }) {
  return <span className={cx(styles.iconCell, className)} aria-hidden="true">
    <AnimatePresence initial={false}>
      <motion.span key={swapKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.1 } }}
        transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}>{children}</motion.span>
    </AnimatePresence>
  </span>;
}

/** When `key` changes, the element's height glides from the old size to the new one instead of jumping. */
export function useHeightFlip(ref: RefObject<HTMLElement | null>, key: string, reduced: boolean) {
  const rest = useRef(0);
  const previous = useRef(key);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => { if (!node.style.height) rest.current = node.getBoundingClientRect().height; });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || previous.current === key) return;
    previous.current = key;
    const from = node.style.height ? node.getBoundingClientRect().height : rest.current;
    node.style.height = "";
    const to = node.getBoundingClientRect().height;
    if (reduced || !from || Math.abs(from - to) < 2) return;
    node.style.overflow = "clip";
    const controls = animate(node, { height: [from, to] }, { ...SETTLE, onComplete: () => { node.style.height = ""; node.style.overflow = ""; } });
    return () => controls.stop();
  }, [key, reduced, ref]);
}

/* Marks -------------------------------------------------------------------------------------------------------- */

export function ModelMark({ model, className }: { model: ChatModel; className?: string }) {
  const Mark = model.mark;
  return <Mark className={cx(styles.mark, className)} style={model.color ? { color: model.color } : undefined} aria-hidden="true" title="" />;
}

function SourceMark({ source }: { source: ChatSource }) {
  const Mark = source.mark;
  return Mark ? <Mark className={styles.mark} style={source.color ? { color: source.color } : undefined} aria-hidden="true" title="" /> : <Globe className={styles.mark} size={14} strokeWidth={1.75} aria-hidden="true" />;
}

/* Model menu ------------------------------------------------------------------------------------------------------ */

export function ModelMenu({ models, value, onChange, reduced }: { models: ChatModel[]; value: ChatModel; onChange: (id: string) => void; reduced: boolean }) {
  const t = useTranslations("ArcChat");
  return <Menu.Root modal={false}>
    <Menu.Trigger className={styles.modelChip} aria-label={t("model", { name: value.name })}>
      <Swap swapKey={value.id} reduced={reduced}><ModelMark model={value} /><span className={styles.modelName}>{value.name}</span></Swap>
      <ChevronDown className={styles.chipChevron} size={14} strokeWidth={1.75} aria-hidden="true" />
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Content className={styles.menu} align="end" sideOffset={6} collisionPadding={12} loop>
        <Menu.RadioGroup value={value.id} onValueChange={onChange}>
          {models.map(model => <Menu.RadioItem key={model.id} value={model.id} className={styles.menuItem}>
            <ModelMark model={model} />
            <span className={styles.menuName}>{model.name}</span>
            {model.note && <span className={styles.menuNote}>{model.note}</span>}
            <span className={styles.menuCheck}><Menu.ItemIndicator><Check size={15} strokeWidth={1.75} aria-hidden="true" /></Menu.ItemIndicator></span>
          </Menu.RadioItem>)}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Portal>
  </Menu.Root>;
}

/* Small buttons --------------------------------------------------------------------------------------------------- */

export function ActionButton({ label, onClick, children, pressed, disabled, className }: { label: string; onClick: () => void; children: ReactNode; pressed?: boolean; disabled?: boolean; className?: string }) {
  return <Tooltip content={label} side="bottom">
    <button type="button" className={cx(styles.action, className)} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>{children}</button>
  </Tooltip>;
}

/** Copies text and crossfades its icon to a check. The parent announces the result. */
export function CopyAction({ text, label, reduced, onCopied }: { text: string; label?: string; reduced: boolean; onCopied: (ok: boolean) => void }) {
  const t = useTranslations("ArcChat");
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    let ok = true;
    try { await navigator.clipboard.writeText(text); } catch { ok = false; }
    setState(ok ? "copied" : "error");
    onCopied(ok);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  }
  return <ActionButton label={label ?? t("copy")} onClick={() => void copy()} className={styles.copyAction}>
    <IconSwap swapKey={state} reduced={reduced} className={styles.copyIcon} >
      <span data-state={state}>{state === "copied" ? <Check size={16} strokeWidth={1.75} /> : state === "error" ? <CircleAlert size={16} strokeWidth={1.75} /> : <Copy size={16} strokeWidth={1.75} />}</span>
    </IconSwap>
  </ActionButton>;
}

/* Reasoning ------------------------------------------------------------------------------------------------------- */

export function ReplyHead({ model, reasoning, thinking, thoughtFor, reduced }: { model: ChatModel; reasoning: string; thinking: boolean; thoughtFor?: number; reduced: boolean }) {
  const t = useTranslations("ArcChat");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const label = thinking ? t("thinking") : thoughtFor ? t("thoughtFor", { seconds: thoughtFor }) : reasoning ? t("thoughtBriefly") : model.name;
  const foldable = !!reasoning && !thinking || (thinking && !!reasoning);
  return <div className={styles.reasoning}>
    <div className={styles.replyHead}>
      <Tooltip content={model.name}><span className={styles.replyMark}><ModelMark model={model} /></span></Tooltip>
      <button type="button" className={styles.thoughtButton} aria-expanded={foldable ? open : undefined} aria-controls={open ? panelId : undefined} disabled={!foldable} onClick={() => setOpen(!open)}>
        <Swap swapKey={thinking ? "thinking" : label} reduced={reduced}>{thinking ? <TextShimmer>{t("thinking")}</TextShimmer> : label}</Swap>
        <ChevronRight className={styles.thoughtChevron} data-open={open || undefined} data-hidden={!foldable || undefined} size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
    <AnimatePresence initial={false}>
      {open && reasoning && <motion.div key="thoughts" id={panelId} className={styles.clip}
        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        transition={reduced ? { duration: 0 } : { height: FOLD, opacity: { duration: 0.16, ease: EASE } }}>
        <p className={styles.thoughtText}>{reasoning}</p>
      </motion.div>}
    </AnimatePresence>
  </div>;
}

/* Tools ----------------------------------------------------------------------------------------------------------- */

const TOOL_ICON = { search: Search, database: Database, code: SquareTerminal, file: FileText };

function uniqueMarks(sources: ChatSource[]) {
  const seen = new Set<string>();
  return sources.filter(source => { const key = domainOf(source.url); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 3);
}

function ToolChip({ tool, open, onToggle, detailId, reduced }: { tool: ChatTool; open: boolean; onToggle: () => void; detailId: string; reduced: boolean }) {
  const running = tool.status === "running";
  const Icon = TOOL_ICON[tool.icon ?? "search"];
  const Mark = tool.mark;
  const hasDetail = !running && !!(tool.input?.length || tool.sources?.length || tool.output);
  return <button type="button" className={styles.toolChip} data-status={tool.status} aria-expanded={hasDetail ? open : undefined} aria-controls={open ? detailId : undefined} disabled={!hasDetail} onClick={onToggle}>
    <IconSwap swapKey={tool.status} reduced={reduced} className={styles.toolIcon}>
      {running ? <LoaderCircle className={styles.spin} size={14} strokeWidth={1.75} /> : tool.status === "error" ? <CircleAlert size={14} strokeWidth={1.75} /> : Mark ? <Mark className={styles.mark} style={tool.color ? { color: tool.color } : undefined} title="" /> : <Icon size={14} strokeWidth={1.75} />}
    </IconSwap>
    <Swap swapKey={running ? "running" : `${tool.status}-${tool.name}`} reduced={reduced}>
      {running ? <TextShimmer>{tool.activeName ?? tool.name}</TextShimmer> : <>
        <span className={styles.toolName}>{tool.name}</span>
        {tool.sources && tool.sources.length > 0 && <span className={styles.toolMarks}>{uniqueMarks(tool.sources).map(source => <SourceMark key={source.url} source={source} />)}</span>}
        {tool.summary && <span className={styles.toolSummary}>{tool.summary}</span>}
      </>}
    </Swap>
  </button>;
}

function ToolDetail({ tool }: { tool: ChatTool }) {
  const t = useTranslations("ArcChat");
  const query = tool.icon === "database" || tool.icon === "code";
  return <div className={styles.toolDetail}>
    {query ? <>
      {tool.input?.map(line => <pre key={line} className={styles.toolCode}>{line}</pre>)}
      {tool.output && <p className={styles.toolOutput}><span>{t("result")}</span><span className={styles.toolOutputValue}>{tool.output}</span></p>}
    </> : <>
      {tool.input && tool.input.length > 0 && <ul className={styles.queries} aria-label={t("searches")}>
        {tool.input.map(line => <li key={line}><Search size={13} strokeWidth={1.75} aria-hidden="true" />{line}</li>)}
      </ul>}
      {tool.sources && tool.sources.length > 0 && <ol className={styles.sourceList} aria-label={t("sources")}>
        {tool.sources.map((source, index) => <li key={source.url + index}>
          <a href={source.url} target="_blank" rel="noreferrer" className={styles.sourceRow}>
            <SourceMark source={source} />
            <span className={styles.sourceRowTitle}>{source.title}</span>
            <span className={styles.sourceRowDomain}>{domainOf(source.url)}</span>
          </a>
        </li>)}
      </ol>}
    </>}
  </div>;
}

export function Tools({ tools, reduced }: { tools: ChatTool[]; reduced: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const detailId = useId();
  const detail = tools.find(tool => tool.id === open && tool.status !== "running");
  return <div className={styles.tools}>
    <div className={styles.toolRow}>
      {tools.map(tool => <ToolChip key={tool.id} tool={tool} open={open === tool.id} detailId={detailId} reduced={reduced} onToggle={() => setOpen(open === tool.id ? null : tool.id)} />)}
    </div>
    <AnimatePresence initial={false}>
      {detail && <motion.div key="detail" id={detailId} className={styles.clip}
        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        transition={reduced ? { duration: 0 } : { height: FOLD, opacity: { duration: 0.16, ease: EASE } }}>
        <ToolDetail tool={detail} />
      </motion.div>}
    </AnimatePresence>
  </div>;
}

/* Versions -------------------------------------------------------------------------------------------------------- */

export function VersionSwitch({ index, total, onChange, disabled }: { index: number; total: number; onChange: (next: number) => void; disabled?: boolean }) {
  const t = useTranslations("ArcChat");
  return <div className={styles.versions} role="group" aria-label={t("version", { index: index + 1, total })}>
    <button type="button" className={styles.versionButton} aria-label={t("previousVersion")} disabled={disabled || index === 0} onClick={() => onChange(index - 1)}><ChevronLeft size={15} strokeWidth={1.75} aria-hidden="true" /></button>
    <span className={styles.versionCount} aria-hidden="true">{index + 1} / {total}</span>
    <button type="button" className={styles.versionButton} aria-label={t("nextVersion")} disabled={disabled || index === total - 1} onClick={() => onChange(index + 1)}><ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" /></button>
  </div>;
}

/* Composer -------------------------------------------------------------------------------------------------------- */

const LINE = 24, PADDING = 12, MAX_LINES = 7;
const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  placeholder: string;
  attachments: AiChatAttachment[];
  onAttach: (files: File[]) => void;
  onRemove: (id: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  reduced: boolean;
}

export function Composer({ value, onChange, onSubmit, onStop, busy, placeholder, attachments, onAttach, onRemove, inputRef, reduced }: ComposerProps) {
  const t = useTranslations("ArcChat");
  const fileRef = useRef<HTMLInputElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(LINE + PADDING);
  // A hidden twin measures the text, and the field glides to that height instead of jumping a line at a time.
  useLayoutEffect(() => {
    const node = mirror.current;
    if (!node) return;
    setHeight(Math.min(node.offsetHeight, LINE * MAX_LINES + PADDING));
  }, [value]);
  useEffect(() => {
    const node = mirror.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(Math.min(node.offsetHeight, LINE * MAX_LINES + PADDING)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const canSend = !!value.trim() || attachments.length > 0;
  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (busy) onStop(); else if (canSend) onSubmit();
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!busy) submit(); }
    if (event.key === "Escape" && busy) { event.preventDefault(); onStop(); }
  }
  return <form className={styles.composer} onSubmit={submit}>
    <AnimatePresence initial={false}>
      {attachments.length > 0 && <motion.div key="files" className={styles.clip} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        transition={reduced ? { duration: 0 } : { height: SETTLE, opacity: { duration: 0.16, ease: EASE } }}>
        <ul className={styles.attachRow} aria-label={t("attachments")}>
          {attachments.map(file => <li key={file.id} className={styles.attachChip}>
            <FileText size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className={styles.attachName}>{file.name}</span>
            <span className={styles.attachSize}>{formatSize(file.size)}</span>
            <button type="button" className={styles.attachRemove} aria-label={t("removeAttachment", { name: file.name })} onClick={() => onRemove(file.id)}><X size={13} strokeWidth={1.75} aria-hidden="true" /></button>
          </li>)}
        </ul>
      </motion.div>}
    </AnimatePresence>
    <div className={styles.composerRow}>
      <Tooltip content={t("attachFiles")}>
        <button type="button" className={styles.roundButton} aria-label={t("attachFiles")} onClick={() => fileRef.current?.click()}><Paperclip size={18} strokeWidth={1.75} aria-hidden="true" /></button>
      </Tooltip>
      <input ref={fileRef} type="file" multiple hidden tabIndex={-1} onChange={event => { const files = Array.from(event.target.files ?? []); if (files.length) onAttach(files); event.target.value = ""; }} />
      <div className={styles.field} style={{ height }}>
        <div ref={mirror} className={styles.mirror} aria-hidden="true">{value + "​"}</div>
        <textarea ref={inputRef} className={styles.input} value={value} rows={1} placeholder={placeholder} aria-label={t("message")}
          onChange={event => onChange(event.target.value)} onKeyDown={onKeyDown} />
      </div>
      <button type="submit" className={styles.send} data-busy={busy || undefined} aria-label={busy ? t("stopReply") : t("sendMessage")} disabled={!busy && !canSend}>
        <IconSwap swapKey={busy ? "stop" : "send"} reduced={reduced}>{busy ? <Square size={13} strokeWidth={0} fill="currentColor" /> : <ArrowUp size={18} strokeWidth={2} />}</IconSwap>
      </button>
    </div>
  </form>;
}
