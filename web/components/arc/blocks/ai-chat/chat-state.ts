import type { AiChatAttachment, AiChatMessage, ChatSource, ChatTool } from "./chat-data";

/*
 * A conversation is a small tree. Each turn holds versions (an edit or a retry adds one), and each version points to the
 * turn that followed it, so switching back to an older version brings back the conversation that grew from it.
 */

export interface Reply {
  id: string;
  model: string;
  status: "thinking" | "streaming" | "done" | "stopped" | "error";
  /** Everything received so far. */
  text: string;
  /** Characters on screen; the reveal clock moves this forward in chunks. */
  shown: number;
  /** Chunk start offsets while text is still fading in. */
  marks?: number[];
  streamDone: boolean;
  reasoning: string;
  thoughtFor?: number;
  tools: ChatTool[];
  sources: ChatSource[];
  error?: string;
  feedback: "up" | "down" | null;
}

export interface Version { id: string; prompt: string; attachments?: AiChatAttachment[]; reply: Reply; next: string | null }
export interface Turn { id: string; versions: Version[]; active: number }
export interface Thread { root: string | null; turns: Record<string, Turn> }
export interface Chat { id: string; title: string; group: string; thread: Thread }

export const emptyThread: Thread = { root: null, turns: {} };

export function newReply(id: string, model: string): Reply {
  return { id, model, status: "thinking", text: "", shown: 0, streamDone: false, reasoning: "", tools: [], sources: [], feedback: null };
}

/** The visible path: each turn with its active version, in order. */
export function walk(thread: Thread) {
  const path: { turn: Turn; version: Version }[] = [];
  let id = thread.root;
  const seen = new Set<string>();
  while (id && thread.turns[id] && !seen.has(id)) {
    seen.add(id);
    const turn = thread.turns[id];
    const version = turn.versions[turn.active];
    path.push({ turn, version });
    id = version.next;
  }
  return path;
}

export function replyMessage(reply: Reply): AiChatMessage {
  return {
    id: reply.id, role: "assistant", content: reply.text.slice(0, reply.shown), model: reply.model, reasoning: reply.reasoning || undefined,
    thoughtFor: reply.thoughtFor, tools: reply.tools, sources: reply.sources,
    status: reply.status === "stopped" ? "stopped" : reply.status === "error" ? "error" : "done", error: reply.error,
  };
}

/** Messages on the visible path up to and including the prompt of `turnId`. */
export function messagesUpTo(thread: Thread, turnId: string): AiChatMessage[] {
  const messages: AiChatMessage[] = [];
  for (const { turn, version } of walk(thread)) {
    messages.push({ id: version.id, role: "user", content: version.prompt, attachments: version.attachments });
    if (turn.id === turnId) break;
    messages.push(replyMessage(version.reply));
  }
  return messages;
}

/** Builds a settled thread from flat messages. A trailing user message gets a pending reply. */
export function threadFrom(messages: AiChatMessage[], model: string, prefix: string): Thread {
  const turns: Record<string, Turn> = {};
  let root: string | null = null;
  let last: Version | null = null;
  let n = 0;
  for (const message of messages) {
    if (message.role === "user") {
      const id = `${prefix}-t${n}`;
      const version: Version = { id: `${prefix}-v${n}`, prompt: message.content, attachments: message.attachments, reply: newReply(`${prefix}-r${n}`, model), next: null };
      turns[id] = { id, versions: [version], active: 0 };
      if (last) last.next = id; else root = id;
      last = version;
      n += 1;
    } else if (last) {
      last.reply = {
        ...last.reply, id: message.id ?? last.reply.id, model: message.model ?? model, status: message.status ?? "done", text: message.content, shown: message.content.length,
        streamDone: true, reasoning: message.reasoning ?? "", thoughtFor: message.thoughtFor, tools: message.tools ?? [], sources: message.sources ?? [], error: message.error,
      };
    }
  }
  return { root, turns };
}

export function patchTurn(thread: Thread, turnId: string, fn: (turn: Turn) => Turn): Thread {
  const turn = thread.turns[turnId];
  return turn ? { ...thread, turns: { ...thread.turns, [turnId]: fn(turn) } } : thread;
}

export function patchReply(thread: Thread, turnId: string, versionId: string, fn: (reply: Reply) => Reply): Thread {
  return patchTurn(thread, turnId, turn => ({ ...turn, versions: turn.versions.map(version => version.id === versionId ? { ...version, reply: fn(version.reply) } : version) }));
}

/** Appends a turn after the last visible one. */
export function appendTurn(thread: Thread, turn: Turn): Thread {
  const turns = { ...thread.turns, [turn.id]: turn };
  const path = walk(thread);
  const last = path[path.length - 1];
  if (!last) return { root: turn.id, turns };
  const owner = turns[last.turn.id];
  turns[owner.id] = { ...owner, versions: owner.versions.map((version, index) => index === owner.active ? { ...version, next: turn.id } : version) };
  return { root: thread.root, turns };
}

export function upsertTool(tools: ChatTool[], tool: ChatTool) {
  return tools.some(item => item.id === tool.id) ? tools.map(item => item.id === tool.id ? { ...item, ...tool } : item) : [...tools, tool];
}
