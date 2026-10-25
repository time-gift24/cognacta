"use client";

import { memo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CircleAlert, FileText, Pencil, RotateCcw, Square, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "../../button/button";
import type { ChatModel } from "./chat-data";
import { Markdown, plainText } from "./chat-markdown";
import { ActionButton, CopyAction, ReplyHead, Tools, VersionSwitch, cx, useHeightFlip } from "./chat-parts";
import type { Turn, Version } from "./chat-state";
import styles from "./chat.module.css";

export interface ThreadActions {
  retry: (turnId: string) => void;
  retryInPlace: (turnId: string, versionId: string) => void;
  edit: (turnId: string, text: string) => void;
  select: (turnId: string, index: number) => void;
  feedback: (turnId: string, versionId: string, value: "up" | "down") => void;
  copied: (ok: boolean) => void;
}

/** `code` in a prompt renders as inline code; everything else stays plain text. */
function promptText(text: string): ReactNode {
  return text.split(/(`[^`\n]+`)/g).map((part, index) => part.startsWith("`") && part.endsWith("`") && part.length > 2
    ? <code key={index} className={styles.inlineCode}>{part.slice(1, -1)}</code>
    : part);
}

function UserMessage({ turnId, version, busy, reduced, actions }: { turnId: string; version: Version; busy: boolean; reduced: boolean; actions: ThreadActions }) {
  const t = useTranslations("ArcChat");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(version.prompt);
  const box = useRef<HTMLDivElement>(null);
  useHeightFlip(box, editing ? "edit" : version.id, reduced);
  const cancel = () => { setEditing(false); setDraft(version.prompt); };
  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setEditing(false);
    if (text !== version.prompt.trim()) actions.edit(turnId, text);
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
    if (event.key === "Escape") { event.preventDefault(); cancel(); }
  }
  return <div ref={box} className={styles.userRow}>
    {editing ? <form className={cx(styles.editor, styles.fadeIn)} onSubmit={submit}>
      <textarea className={styles.editorInput} value={draft} aria-label={t("editMessage")} autoFocus rows={Math.min(8, Math.max(2, draft.split("\n").length + Math.floor(draft.length / 70)))}
        onChange={event => setDraft(event.target.value)} onKeyDown={onKeyDown}
        onFocus={event => { const end = event.currentTarget.value.length; event.currentTarget.setSelectionRange(end, end); }} />
      <div className={styles.editorBar}>
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>{t("cancel")}</Button>
        <Button type="submit" variant="primary" size="sm" disabled={!draft.trim()}>{t("send")}</Button>
      </div>
    </form> : <>
      <div className={cx(styles.userActions, styles.hoverable)}>
        <CopyAction text={version.prompt} label={t("copy")} reduced={reduced} onCopied={actions.copied} />
        <ActionButton label={t("edit")} disabled={busy} onClick={() => { setDraft(version.prompt); setEditing(true); }}><Pencil size={15} strokeWidth={1.75} aria-hidden="true" /></ActionButton>
      </div>
      <div className={styles.bubble}>
        {version.attachments && version.attachments.length > 0 && <ul className={styles.bubbleFiles} aria-label={t("attachments")}>
          {version.attachments.map(file => <li key={file.id}><FileText size={14} strokeWidth={1.75} aria-hidden="true" />{file.name}</li>)}
        </ul>}
        {version.prompt && <p className={styles.bubbleText}>{promptText(version.prompt)}</p>}
      </div>
    </>}
  </div>;
}

function AssistantReply({ turn, version, model, busy, reduced, actions }: { turn: Turn; version: Version; model: ChatModel; busy: boolean; reduced: boolean; actions: ThreadActions }) {
  const t = useTranslations("ArcChat");
  const reply = version.reply;
  const pending = reply.status === "thinking" || reply.status === "streaming";
  const thinking = reply.status === "thinking" && reply.thoughtFor === undefined && !reply.text;
  const settled = reply.status === "done" || reply.status === "stopped";
  const visible = reply.text.slice(0, reply.shown);
  return <div className={styles.reply} aria-busy={pending || undefined} data-pending={pending || undefined}>
    <ReplyHead key={reply.id} model={model} reasoning={reply.reasoning} thinking={thinking} thoughtFor={reply.thoughtFor} reduced={reduced} />
    {reply.tools.length > 0 && <Tools key={`tools-${reply.id}`} tools={reply.tools} reduced={reduced} />}
    {reply.shown > 0 && <Markdown source={reply.text} shown={reply.shown} marks={reply.marks} sources={reply.sources} />}
    {reply.status === "stopped" && <p className={cx(styles.statusLine, styles.fadeIn)}><Square size={11} strokeWidth={0} fill="currentColor" aria-hidden="true" />{reply.shown ? t("stopped") : t("stoppedBefore")}</p>}
    {reply.status === "error" && <div className={cx(styles.error, styles.fadeIn)}>
      <CircleAlert className={styles.errorIcon} size={16} strokeWidth={1.75} aria-hidden="true" />
      <p className={styles.errorText}><span className={styles.errorTitle}>{t("replyFailed")}</span> {reply.error}</p>
      <Button variant="secondary" size="sm" onClick={() => actions.retryInPlace(turn.id, version.id)}>{t("retry")}</Button>
    </div>}
    {reply.status !== "error" && <div className={styles.actions} data-hidden={!settled || undefined}>
      {turn.versions.length > 1 && <VersionSwitch index={turn.active} total={turn.versions.length} disabled={busy} onChange={index => actions.select(turn.id, index)} />}
      <div className={cx(styles.actionGroup, styles.hoverable)}>
        <CopyAction text={plainText(visible)} label={t("copy")} reduced={reduced} onCopied={actions.copied} />
        <ActionButton label={t("retry")} onClick={() => actions.retry(turn.id)}><RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" /></ActionButton>
        <ActionButton label={t("goodResponse")} pressed={reply.feedback === "up"} onClick={() => actions.feedback(turn.id, version.id, "up")}>
          <ThumbsUp size={15} strokeWidth={1.75} fill={reply.feedback === "up" ? "currentColor" : "none"} aria-hidden="true" />
        </ActionButton>
        <ActionButton label={t("badResponse")} pressed={reply.feedback === "down"} onClick={() => actions.feedback(turn.id, version.id, "down")}>
          <ThumbsDown size={15} strokeWidth={1.75} fill={reply.feedback === "down" ? "currentColor" : "none"} aria-hidden="true" />
        </ActionButton>
      </div>
    </div>}
  </div>;
}

export const TurnView = memo(function TurnView({ turn, version, model, last, busy, reduced, actions }: { turn: Turn; version: Version; model: ChatModel; last: boolean; busy: boolean; reduced: boolean; actions: ThreadActions }) {
  const t = useTranslations("ArcChat");
  const box = useRef<HTMLDivElement>(null);
  // Switching versions glides the turn to its new height and fades the new version in.
  useHeightFlip(box, version.id, reduced);
  return <article ref={box} className={styles.turn} data-last={last || undefined} aria-label={t("message")}>
    <div key={version.id} className={cx(styles.turnBody, styles.fadeIn)}>
      <UserMessage turnId={turn.id} version={version} busy={busy} reduced={reduced} actions={actions} />
      <AssistantReply turn={turn} version={version} model={model} busy={busy} reduced={reduced} actions={actions} />
    </div>
  </article>;
});
