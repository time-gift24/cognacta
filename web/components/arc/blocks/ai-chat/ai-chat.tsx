"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useTranslations } from "next-intl";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Activity, ArrowDown, Check, ChevronDown, Database, Search, SquarePen, Timer } from "lucide-react";
import { Tooltip } from "../../tooltip/tooltip";
import { createSampleResponder, demoPrompts, sampleHistory, sampleModels, sampleSuggestions, titleFor } from "./chat-data";
import type { AiChatAttachment, AiChatHistoryItem, AiChatMessage, ChatModel, ChatRespond, ChatSuggestion } from "./chat-data";
import { nextCut } from "./chat-markdown";
import { Composer, ModelMenu, Swap, cx, useReduced } from "./chat-parts";
import { TurnView } from "./chat-thread";
import type { ThreadActions } from "./chat-thread";
import { appendTurn, emptyThread, messagesUpTo, newReply, patchReply, patchTurn, replyMessage, threadFrom, upsertTool, walk } from "./chat-state";
import type { Chat, Reply, Thread } from "./chat-state";
import styles from "./chat.module.css";

export type { AiChatAttachment, AiChatHistoryItem, AiChatMessage, ChatMark, ChatModel, ChatRespond, ChatRespondOptions, ChatSource, ChatStreamEvent, ChatSuggestion, ChatTool } from "./chat-data";
export { createSampleResponder, sampleHistory, sampleModels, sampleSuggestions } from "./chat-data";

export interface AiChatProps {
  /** Models in the header menu. The first is the default unless `defaultModel` names another. */
  models?: ChatModel[];
  defaultModel?: string;
  /** Controlled model selected outside the chat, such as from the workspace composer. */
  model?: string;
  /** Streams a reply for the messages on screen. Without it the chat plays scripted, simulated replies. */
  respond?: ChatRespond;
  /** Messages the open conversation starts with. A trailing user message is answered on mount. */
  initialMessages?: AiChatMessage[];
  /** Title of the open conversation. Defaults to one taken from its first message. */
  title?: string;
  /** Earlier conversations in the title menu. Defaults to sample chats only in the simulated preview. */
  history?: AiChatHistoryItem[];
  suggestions?: ChatSuggestion[];
  greeting?: string;
  placeholder?: string;
  /** Plays a short scripted conversation once the card scrolls into view. Defaults to true without `respond` and `initialMessages`. */
  autoPlay?: boolean;
  /** Hide the title/model header when the surrounding workspace already carries that context. */
  showHeader?: boolean;
  /** Replace the built-in composer, usually with the workspace's shared composer. */
  renderComposer?: (api: {
    busy: boolean;
    send: (text: string, files?: AiChatAttachment[]) => void;
    stop: () => void;
  }) => ReactNode;
  onFeedback?: (message: AiChatMessage, value: "up" | "down" | null) => void;
  onModelChange?: (model: ChatModel) => void;
  onNewChat?: () => void;
  className?: string;
}

type Run = { controller: AbortController; chatId: string; turnId: string; versionId: string; started: number };

const TICK = 34;
const DEMO = "chat-demo";
let counter = 0;
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
const SUGGESTION_ICON = { database: Database, timer: Timer, activity: Activity, search: Search };

function seed(props: AiChatProps, model: string, demo: boolean): Chat[] {
  const history = (props.history ?? (props.respond || props.initialMessages ? [] : sampleHistory))
    .map(item => ({ id: item.id, title: item.title, group: item.group ?? "Earlier", thread: threadFrom(item.messages, model, item.id) }));
  let current: Chat;
  if (props.initialMessages?.length) {
    const first = props.initialMessages.find(message => message.role === "user")?.content ?? "";
    current = { id: "chat-current", title: props.title ?? titleFor(first), group: "Today", thread: threadFrom(props.initialMessages, model, "initial") };
  } else if (demo) {
    current = { id: DEMO, title: props.title ?? titleFor(demoPrompts[0]), group: "Today", thread: threadFrom([{ role: "user", content: demoPrompts[0] }], model, "demo") };
  } else {
    current = { id: "chat-new", title: props.title ?? "", group: "Today", thread: emptyThread };
  }
  return [current, ...history];
}

/**
 * A focused AI chat card: a model menu and a chat menu in a slim header, a thread that streams markdown answers with
 * folding reasoning, tool chips and cited sources, versions for edits and retries, and a docked composer that turns into
 * Stop while a reply streams. With no props it plays a short scripted conversation and answers new messages with
 * simulated replies; pass `respond` to stream real ones.
 */
export function AiChat(props: AiChatProps) {
  const { models = sampleModels, respond, suggestions = sampleSuggestions, greeting = "What are we working on?", placeholder = "Ask anything", showHeader = true, renderComposer, onFeedback, onModelChange, onNewChat, className } = props;
  const reduced = useReduced();
  const t = useTranslations("ArcChat");
  const playDemo = props.autoPlay ?? (!respond && !props.initialMessages?.length);
  const simulated = !respond;
  const responder = useMemo(() => respond ?? createSampleResponder(), [respond]);

  const [modelId, setModelId] = useState(() => props.defaultModel ?? models[0]?.id ?? "");
  const externalModel = props.model;
  const activeModelId = externalModel && models.some(item => item.id === externalModel) ? externalModel : modelId;
  const model = models.find(item => item.id === activeModelId) ?? models[0];
  const modelFor = useCallback((id: string) => models.find(item => item.id === id) ?? sampleModels.find(item => item.id === id) ?? models[0], [models]);

  useEffect(() => {
    if (externalModel && externalModel !== modelId && models.some(item => item.id === externalModel)) setModelId(externalModel);
  }, [externalModel, modelId, models]);

  const [chats, setChats] = useState<Chat[]>(() => seed(props, props.defaultModel ?? models[0]?.id ?? "", playDemo));
  const [currentId, setCurrentId] = useState(() => chats[0].id);
  const chatsRef = useRef(chats);
  const currentRef = useRef(currentId);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<AiChatAttachment[]>([]);
  const [running, setRunning] = useState<Run | null>(null);
  const [announcement, setAnnouncement] = useState({ text: "", n: 0 });
  const [showJump, setShowJump] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const runRef = useRef<Run | null>(null);
  const stuck = useRef(true);
  const follow = useRef<() => void>(() => {});
  const scrollMemory = useRef(new Map<string, { top: number; bottom: boolean }>());
  const demoStep = useRef(playDemo ? 0 : -1);
  const demoTimer = useRef(0);
  const reducedRef = useRef(reduced);
  const inView = useInView(rootRef, { once: true, amount: 0.2 });

  const chat = chats.find(item => item.id === currentId) ?? chats[0];
  const path = walk(chat.thread);
  const busy = running?.chatId === chat.id;

  /* State plumbing ------------------------------------------------------------------------------------------------ */

  const commit = useCallback((fn: (list: Chat[]) => Chat[]) => { chatsRef.current = fn(chatsRef.current); setChats(chatsRef.current); }, []);
  const updateThread = useCallback((chatId: string, fn: (thread: Thread) => Thread) => commit(list => list.map(item => item.id === chatId ? { ...item, thread: fn(item.thread) } : item)), [commit]);
  const findReply = (run: Pick<Run, "chatId" | "turnId" | "versionId">) => chatsRef.current.find(item => item.id === run.chatId)?.thread.turns[run.turnId]?.versions.find(version => version.id === run.versionId)?.reply;
  const announce = useCallback((text: string) => setAnnouncement(previous => ({ text, n: previous.n + 1 })), []);
  const sim = simulated ? " (simulated)" : "";

  function cancelDemo() { demoStep.current = -1; window.clearTimeout(demoTimer.current); }

  function finish(run: Run, outcome: "done" | "stopped" | "error", message?: string) {
    if (runRef.current !== run) return;
    runRef.current = null;
    setRunning(null);
    announce(outcome === "done" ? t("replyFinished") : outcome === "error" ? t("replyFailedAnnounce", { message: message ?? "" }) : t("replyStopped"));
    // The last chunk finishes fading before the text settles into plain strings.
    window.setTimeout(() => updateThread(run.chatId, thread => patchReply(thread, run.turnId, run.versionId, reply => reply.marks ? { ...reply, marks: undefined } : reply)), 240);
    if (outcome === "done") afterReply(run);
  }

  function afterReply(run: Run) {
    if (run.chatId !== DEMO) return;
    if (demoStep.current === 0) {
      demoStep.current = 1;
      demoTimer.current = window.setTimeout(() => {
        if (demoStep.current !== 1 || currentRef.current !== DEMO || runRef.current || inputRef.current?.value) return;
        demoStep.current = 2;
        api.current.send(demoPrompts[1], [], true);
      }, 1500);
    } else if (demoStep.current === 2) demoStep.current = -1;
  }

  async function run(chatId: string, turnId: string, versionId: string) {
    const current: Run = { controller: new AbortController(), chatId, turnId, versionId, started: performance.now() };
    const { signal } = current.controller;
    runRef.current = current;
    setRunning(current);
    const pending = findReply(current);
    const replyModel = modelFor(pending?.model ?? activeModelId);
    announce(`${replyModel.name} is replying${sim}`);
    const patch = (fn: (reply: Reply) => Reply) => updateThread(chatId, thread => patchReply(thread, turnId, versionId, fn));
    const seconds = () => Math.max(1, Math.round((performance.now() - current.started) / 1000));
    try {
      const thread = chatsRef.current.find(item => item.id === chatId)?.thread ?? emptyThread;
      for await (const event of responder(messagesUpTo(thread, turnId), { signal, model: replyModel })) {
        if (signal.aborted) return;
        if (event.type === "reasoning") patch(reply => ({ ...reply, reasoning: reply.reasoning + event.delta }));
        else if (event.type === "reasoning-end") patch(reply => ({ ...reply, thoughtFor: event.seconds ?? seconds() }));
        else if (event.type === "tool") patch(reply => ({ ...reply, tools: upsertTool(reply.tools, event.tool) }));
        else if (event.type === "sources") patch(reply => ({ ...reply, sources: event.sources }));
        else if (event.type === "text") patch(reply => ({ ...reply, text: reply.text + event.delta, status: "streaming", thoughtFor: reply.thoughtFor ?? (reply.reasoning ? seconds() : undefined) }));
        else if (event.type === "error") throw new Error(event.message);
      }
      if (signal.aborted) return;
      patch(reply => ({ ...reply, streamDone: true, status: reply.text ? "streaming" : "done", thoughtFor: reply.thoughtFor ?? (reply.reasoning ? seconds() : undefined) }));
      if (!findReply(current)?.text) finish(current, "done");
    } catch (error) {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : String(error);
      patch(reply => ({ ...reply, status: "error", error: message, text: reply.text.slice(0, reply.shown), marks: undefined, streamDone: true, tools: reply.tools.map(tool => tool.status === "running" ? { ...tool, status: "error" } : tool) }));
      finish(current, "error", message);
    }
  }

  function stop() {
    const current = runRef.current;
    if (!current) return;
    current.controller.abort();
    const seconds = Math.max(1, Math.round((performance.now() - current.started) / 1000));
    updateThread(current.chatId, thread => patchReply(thread, current.turnId, current.versionId, reply => ({
      ...reply, status: "stopped", text: reply.text.slice(0, reply.shown), streamDone: true, thoughtFor: reply.thoughtFor ?? (reply.reasoning ? seconds : undefined),
      tools: reply.tools.map(tool => tool.status === "running" ? { ...tool, status: "error", name: tool.activeName ?? tool.name, summary: t("stopped") } : tool),
    })));
    finish(current, "stopped");
  }

  function stickToBottom() { stuck.current = true; setShowJump(false); follow.current(); }

  function send(text: string, files: AiChatAttachment[] = attachments, fromDemo = false) {
    const prompt = text.trim();
    if (!prompt && !files.length) return;
    if (!fromDemo) cancelDemo();
    if (runRef.current) stop();
    const chatId = currentRef.current;
    const turnId = makeId("turn"), versionId = makeId("version");
    updateThread(chatId, thread => appendTurn(thread, { id: turnId, versions: [{ id: versionId, prompt, attachments: files.length ? files : undefined, reply: newReply(makeId("reply"), activeModelId), next: null }], active: 0 }));
    commit(list => list.map(item => item.id === chatId && !item.title ? { ...item, title: titleFor(prompt || files[0].name) } : item));
    if (!fromDemo) { setDraft(""); setAttachments([]); }
    stickToBottom();
    void run(chatId, turnId, versionId);
  }

  function addVersion(turnId: string, prompt?: string) {
    cancelDemo();
    if (runRef.current) stop();
    const chatId = currentRef.current;
    const turn = chatsRef.current.find(item => item.id === chatId)?.thread.turns[turnId];
    if (!turn) return;
    const base = turn.versions[turn.active];
    const versionId = makeId("version");
    updateThread(chatId, thread => patchTurn(thread, turnId, current => ({
      ...current, active: current.versions.length,
      versions: [...current.versions, { id: versionId, prompt: prompt ?? base.prompt, attachments: base.attachments, reply: newReply(makeId("reply"), activeModelId), next: null }],
    })));
    stickToBottom();
    void run(chatId, turnId, versionId);
  }

  const actionsImpl: ThreadActions = {
    retry: turnId => addVersion(turnId),
    edit: (turnId, text) => addVersion(turnId, text),
    retryInPlace: (turnId, versionId) => {
      cancelDemo();
      if (runRef.current) stop();
      const chatId = currentRef.current;
      updateThread(chatId, thread => patchReply(thread, turnId, versionId, () => newReply(makeId("reply"), activeModelId)));
      stickToBottom();
      void run(chatId, turnId, versionId);
    },
    select: (turnId, index) => {
      updateThread(currentRef.current, thread => patchTurn(thread, turnId, turn => ({ ...turn, active: Math.max(0, Math.min(turn.versions.length - 1, index)) })));
      const turn = chatsRef.current.find(item => item.id === currentRef.current)?.thread.turns[turnId];
      if (turn) announce(`Version ${turn.active + 1} of ${turn.versions.length}`);
    },
    feedback: (turnId, versionId, value) => {
      const reply = findReply({ chatId: currentRef.current, turnId, versionId });
      if (!reply) return;
      const next = reply.feedback === value ? null : value;
      updateThread(currentRef.current, thread => patchReply(thread, turnId, versionId, current => ({ ...current, feedback: next })));
      if (onFeedback) onFeedback(replyMessage(reply), next);
      announce(next ? (next === "up" ? t("feedbackGood") : t("feedbackBad")) : t("feedbackRemoved"));
    },
    copied: ok => announce(ok ? t("copiedAnnounce") : t("copyFailedAnnounce")),
  };

  // Handlers read the latest render through this ref, so memoized turns and timers never call a stale closure.
  const api = useRef({ send, actions: actionsImpl });
  useLayoutEffect(() => { api.current = { send, actions: actionsImpl }; });
  const actions = useMemo<ThreadActions>(() => ({
    retry: (...args) => api.current.actions.retry(...args),
    edit: (...args) => api.current.actions.edit(...args),
    retryInPlace: (...args) => api.current.actions.retryInPlace(...args),
    select: (...args) => api.current.actions.select(...args),
    feedback: (...args) => api.current.actions.feedback(...args),
    copied: (...args) => api.current.actions.copied(...args),
  }), []);

  function changeModel(id: string) {
    const next = models.find(item => item.id === id);
    if (!next || next.id === modelId) return;
    setModelId(next.id);
    onModelChange?.(next);
    announce(t("modelSelected", { name: next.name }));
  }

  function saveScroll() {
    const scroller = scrollerRef.current;
    if (scroller) scrollMemory.current.set(currentRef.current, { top: scroller.scrollTop, bottom: stuck.current });
  }

  function openChat(id: string) {
    if (id === currentRef.current) return;
    cancelDemo();
    saveScroll();
    currentRef.current = id;
    setCurrentId(id);
    const next = chatsRef.current.find(item => item.id === id);
    announce(t("openedChat", { title: next?.title || t("untitledChat") }));
  }

  function newChat() {
    cancelDemo();
    const blank = chatsRef.current.find(item => !item.thread.root && !item.title);
    if (blank) openChat(blank.id);
    else {
      const id = makeId("chat");
      saveScroll();
      commit(list => [{ id, title: "", group: "Today", thread: emptyThread }, ...list]);
      currentRef.current = id;
      setCurrentId(id);
      announce(t("newChatAnnounce"));
    }
    onNewChat?.();
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }

  /** Runs when a conversation's pane mounts: back to where the reader left it, or the latest message. */
  function restoreScroll(id: string) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const saved = scrollMemory.current.get(id);
    if (!saved || saved.bottom) { scroller.scrollTop = scroller.scrollHeight; stuck.current = true; setShowJump(false); }
    else { scroller.scrollTop = saved.top; stuck.current = false; setShowJump(scroller.scrollHeight - scroller.clientHeight - saved.top > 8); }
  }

  /* Effects ------------------------------------------------------------------------------------------------------- */

  useEffect(() => { reducedRef.current = reduced; }, [reduced]);

  // The reveal clock: on a steady tick, show the next few whole words of whatever has arrived, and settle when done.
  useEffect(() => {
    if (!running) return;
    let frame = 0, last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < TICK) return;
      last = now;
      const reply = findReply(running);
      if (!reply || reply.status !== "streaming") return;
      if (reply.shown >= reply.text.length) {
        if (reply.streamDone) {
          updateThread(running.chatId, thread => patchReply(thread, running.turnId, running.versionId, current => ({ ...current, status: "done" })));
          finish(running, "done");
        }
        return;
      }
      const cut = nextCut(reply.text, reply.shown, reply.text.length - reply.shown > 600 ? 4 : 3, reply.streamDone);
      if (cut > reply.shown) updateThread(running.chatId, thread => patchReply(thread, running.turnId, running.versionId, current => ({ ...current, shown: cut, marks: [...(current.marks ?? []), current.shown] })));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the clock reads live state through refs
  }, [running]);

  // Stick to the bottom while content grows, following on a soft lerp so new lines glide up. Scrolling up releases it.
  useEffect(() => {
    const scroller = scrollerRef.current, content = contentRef.current;
    if (!scroller || !content || typeof ResizeObserver === "undefined") return;
    let frame = 0, touchY = 0;
    const atBottom = () => scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop < 8;
    const step = () => {
      frame = 0;
      if (!stuck.current) return;
      const gap = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
      if (gap <= .5) return;
      scroller.scrollTop += reducedRef.current ? gap : Math.max(1, gap * .22);
      frame = requestAnimationFrame(step);
    };
    follow.current = () => { if (!frame) frame = requestAnimationFrame(step); };
    const observer = new ResizeObserver(() => follow.current());
    observer.observe(content);
    observer.observe(scroller);
    const release = () => { stuck.current = false; };
    const onWheel = (event: WheelEvent) => { if (event.deltaY < 0) release(); };
    const onTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const onTouchMove = (event: TouchEvent) => { if ((event.touches[0]?.clientY ?? 0) > touchY + 4) release(); };
    const onKey = (event: KeyboardEvent) => { if (["ArrowUp", "PageUp", "Home"].includes(event.key)) release(); };
    const onPointer = (event: PointerEvent) => { if (event.target === scroller) release(); };
    const onScroll = () => {
      const bottom = atBottom();
      if (bottom) stuck.current = true;
      setShowJump(!bottom && !stuck.current);
    };
    scroller.addEventListener("wheel", onWheel, { passive: true });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: true });
    scroller.addEventListener("keydown", onKey);
    scroller.addEventListener("pointerdown", onPointer);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("keydown", onKey);
      scroller.removeEventListener("pointerdown", onPointer);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, []);

  // A pending reply on first view (the scripted demo, or a trailing user message) starts once the card is visible.
  useEffect(() => {
    if ((!inView && playDemo) || runRef.current) return;
    const current = chatsRef.current.find(item => item.id === currentRef.current);
    const last = current ? walk(current.thread).at(-1) : undefined;
    if (!current || !last || last.version.reply.status !== "thinking") return;
    const timer = window.setTimeout(() => { if (!runRef.current) void run(current.id, last.turn.id, last.version.id); }, demoStep.current === 0 ? 450 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- starts once when the card first enters the viewport (or immediately for a real responder)
  }, [inView, playDemo]);

  useEffect(() => () => { window.clearTimeout(demoTimer.current); runRef.current?.controller.abort(); }, []);

  /* Render -------------------------------------------------------------------------------------------------------- */

  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, Chat[]>();
    for (const item of chats) {
      if (!byGroup.has(item.group)) { byGroup.set(item.group, []); order.push(item.group); }
      byGroup.get(item.group)!.push(item);
    }
    return order.map(name => ({ name: name === "Today" ? t("today") : name, chats: byGroup.get(name)! }));
  }, [chats, t]);
  const title = chat.title || t("newChat");

  return <section ref={rootRef} className={cx(styles.root, className)} aria-label={t("label")}>
    {showHeader ? <header className={styles.header}>
      <Menu.Root modal={false}>
        <Menu.Trigger className={styles.titleButton} aria-label={t("chatMenu", { title })}>
          <Swap swapKey={`${chat.id}:${title}`} reduced={reduced} className={styles.titleSwap}><span className={styles.titleText}>{title}</span></Swap>
          <ChevronDown className={styles.chipChevron} size={14} strokeWidth={1.75} aria-hidden="true" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content className={cx(styles.menu, styles.chatMenu)} align="start" sideOffset={6} collisionPadding={12} loop>
            <Menu.Item className={styles.menuItem} onSelect={newChat}><SquarePen size={15} strokeWidth={1.75} aria-hidden="true" /><span className={styles.menuName}>{t("newChat")}</span></Menu.Item>
            <Menu.Separator className={styles.menuSeparator} />
            {groups.map(group => <Menu.RadioGroup key={group.name} value={chat.id} onValueChange={openChat}>
              <Menu.Label className={styles.menuLabel}>{group.name}</Menu.Label>
              {group.chats.map(item => <Menu.RadioItem key={item.id} value={item.id} className={styles.menuItem}>
                <span className={styles.menuName}>{item.title || t("untitledChat")}</span>
                <span className={styles.menuCheck}><Menu.ItemIndicator><Check size={15} strokeWidth={1.75} aria-hidden="true" /></Menu.ItemIndicator></span>
              </Menu.RadioItem>)}
            </Menu.RadioGroup>)}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <span className={styles.spacer} />
      {model && <ModelMenu models={models} value={model} onChange={changeModel} reduced={reduced} />}
      <Tooltip content={t("newChat")} side="bottom">
        <button type="button" className={styles.iconButton} aria-label={t("newChat")} onClick={newChat}><SquarePen size={18} strokeWidth={1.75} aria-hidden="true" /></button>
      </Tooltip>
    </header> : null}

    <div className={cx(styles.body, !showHeader && styles.bodyNoHeader)}>
      <div ref={scrollerRef} className={styles.scroller}>
        <div ref={contentRef} className={styles.content}>
          <AnimatePresence mode="wait" initial={false}>
            <ChatPane key={chat.id} id={chat.id} reduced={reduced} onShow={restoreScroll}>
              {path.length ? <div className={styles.thread}>
                {path.map(({ turn, version }, index) => <TurnView key={turn.id} turn={turn} version={version} model={modelFor(version.reply.model)}
                  last={index === path.length - 1} busy={busy} reduced={reduced} actions={actions} />)}
              </div> : <div className={styles.empty}>
                <h2 className={styles.greeting}>{greeting}</h2>
                <ul className={styles.suggestions}>
                  {suggestions.map(suggestion => {
                    const Icon = SUGGESTION_ICON[suggestion.icon ?? "search"];
                    return <li key={suggestion.label}><button type="button" className={styles.suggestion} onClick={() => send(suggestion.prompt ?? suggestion.label, [])}>
                      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />{suggestion.label}
                    </button></li>;
                  })}
                </ul>
              </div>}
            </ChatPane>
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {showJump && <motion.button key="jump" type="button" className={styles.jump} aria-label={t("scrollToLatest")}
          initial={{ opacity: 0, y: reduced ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 4, transition: { duration: .1 } }}
          transition={{ duration: .16, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => { stuck.current = true; setShowJump(false); scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: reduced ? "auto" : "smooth" }); }}>
          <ArrowDown size={16} strokeWidth={1.75} aria-hidden="true" />
        </motion.button>}
      </AnimatePresence>
    </div>

    <div className={styles.composerDock}>
      {renderComposer ? renderComposer({ busy, send, stop }) : <Composer value={draft} busy={busy} placeholder={placeholder} attachments={attachments} inputRef={inputRef} reduced={reduced}
        onChange={value => { cancelDemo(); setDraft(value); }}
        onSubmit={() => send(draft)} onStop={stop}
        onAttach={files => { cancelDemo(); setAttachments(current => [...current, ...files.map(file => ({ id: makeId("file"), name: file.name, size: file.size, type: file.type }))].slice(0, 4)); announce(files.length === 1 ? t("attachOne", { name: files[0].name }) : t("attachMany", { count: files.length })); }}
        onRemove={id => setAttachments(current => current.filter(file => file.id !== id))} />}
    </div>
    <p className={styles.srOnly} role="status" aria-live="polite">{announcement.text}{announcement.n % 2 ? " " : ""}</p>
  </section>;
}

/** One conversation. Panes crossfade when the chat changes: the old one fades out fast, the new one fades in from 4px. */
function ChatPane({ id, reduced, onShow, children }: { id: string; reduced: boolean; onShow: (id: string) => void; children: ReactNode }) {
  const show = useRef(onShow);
  useLayoutEffect(() => { show.current(id); }, [id]);
  return <motion.div className={styles.pane}
    initial={{ opacity: 0, y: reduced ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: reduced ? 0 : .1 } }}
    transition={{ duration: reduced ? 0 : .16, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

export default AiChat;
