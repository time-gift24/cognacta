import type { ComponentType } from "react";
import { ClaudeMark, GeminiColorMark, GithubMark, MistralColorMark, OpenaiMark, PostgresqlMark } from "./ai-chat-marks";
import type { MarkProps } from "./ai-chat-marks";

/* Types ------------------------------------------------------------------------------------------------------------ */

export type ChatMark = ComponentType<MarkProps>;

export interface ChatModel {
  id: string;
  name: string;
  /** Short muted text in the model menu, such as the provider. */
  note?: string;
  mark: ChatMark;
  /** Brand color for a mono mark. Color marks keep their own fills. */
  color?: string;
}

export interface ChatSource {
  title: string;
  url: string;
  snippet?: string;
  mark?: ChatMark;
  color?: string;
}

export interface ChatTool {
  id: string;
  /** Done label, such as "Searched the web". */
  name: string;
  /** Running label, such as "Searching the web". */
  activeName?: string;
  status: "running" | "done" | "error";
  /** Short result after the name, such as "4 sources" or "40,213,880 rows". */
  summary?: string;
  /** What the tool ran: search queries, or a query or command shown in mono. */
  input?: string[];
  output?: string;
  sources?: ChatSource[];
  icon?: "search" | "database" | "code" | "file";
  mark?: ChatMark;
  color?: string;
}

export interface AiChatAttachment { id: string; name: string; size: number; type?: string }

export interface AiChatMessage {
  id?: string;
  role: "user" | "assistant";
  /** Markdown. Paragraphs, ordered and bulleted lists, `inline code`, **bold**, fenced code blocks and [1] citations. */
  content: string;
  /** Assistant only: the model id that wrote it. */
  model?: string;
  reasoning?: string;
  /** Seconds of reasoning, shown as "Thought for 4s". */
  thoughtFor?: number;
  tools?: ChatTool[];
  /** Numbered in order: [1] cites the first source. */
  sources?: ChatSource[];
  attachments?: AiChatAttachment[];
  status?: "done" | "stopped" | "error";
  error?: string;
}

export type ChatStreamEvent =
  | { type: "reasoning"; delta: string }
  | { type: "reasoning-end"; seconds?: number }
  | { type: "tool"; tool: ChatTool }
  | { type: "sources"; sources: ChatSource[] }
  | { type: "text"; delta: string }
  | { type: "error"; message: string };

export interface ChatRespondOptions { signal: AbortSignal; model: ChatModel }
/** Streams one assistant reply. The reply ends when the iterable finishes; throw or yield an error event to fail it. */
export type ChatRespond = (messages: AiChatMessage[], options: ChatRespondOptions) => AsyncIterable<ChatStreamEvent>;

export interface ChatSuggestion { label: string; prompt?: string; icon?: "database" | "timer" | "activity" | "search" }

/* Sample models (October 2026) ------------------------------------------------------------------------------------ */

export const sampleModels: ChatModel[] = [
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", note: "Anthropic", mark: ClaudeMark, color: "#D97757" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", note: "Anthropic", mark: ClaudeMark, color: "#D97757" },
  { id: "gpt-6-1-sol", name: "GPT-6.1 Sol", note: "OpenAI", mark: OpenaiMark },
  { id: "gemini-4-argon", name: "Gemini 4 Argon", note: "Google", mark: GeminiColorMark },
  { id: "mistral-large-4", name: "Mistral Large 4", note: "Mistral AI", mark: MistralColorMark },
];

/* Sample sources ------------------------------------------------------------------------------------------------- */

const PG = { mark: PostgresqlMark, color: "#4169E1" };
const GH = { mark: GithubMark };
const alterTable: ChatSource = { ...PG, title: "PostgreSQL 17: ALTER TABLE", url: "https://www.postgresql.org/docs/17/sql-altertable.html", snippet: "Validating a constraint takes only a SHARE UPDATE EXCLUSIVE lock, and SET NOT NULL skips the table scan when a valid CHECK constraint already proves no NULL can exist." };
const locking: ChatSource = { ...PG, title: "PostgreSQL 17: Explicit locking", url: "https://www.postgresql.org/docs/17/explicit-locking.html", snippet: "SHARE UPDATE EXCLUSIVE protects a table against concurrent schema changes and VACUUM runs. It does not conflict with the ROW EXCLUSIVE lock that writes take." };
const strongMigrations: ChatSource = { ...GH, title: "strong_migrations: Setting NOT NULL on an existing column", url: "https://github.com/ankane/strong_migrations", snippet: "Add a check constraint without validating existing rows, validate it in a separate step, then set NOT NULL." };
const lockTimeout: ChatSource = { ...PG, title: "PostgreSQL 17: Client connection defaults", url: "https://www.postgresql.org/docs/17/runtime-config-client.html", snippet: "lock_timeout aborts any statement that waits longer than the given time while trying to acquire a lock." };
const createIndex: ChatSource = { ...PG, title: "PostgreSQL 17: CREATE INDEX", url: "https://www.postgresql.org/docs/17/sql-createindex.html", snippet: "With CONCURRENTLY, PostgreSQL builds the index without taking any locks that prevent concurrent inserts, updates or deletes on the table." };

/* Scripted replies ------------------------------------------------------------------------------------------------ */

interface ScriptedReply {
  id: string;
  match: RegExp;
  title: string;
  reasoning: string;
  seconds: number;
  tool?: ChatTool;
  /** The first attempt fails at the tool step with this message; Retry succeeds. */
  failFirst?: string;
  sources?: ChatSource[];
  text: string;
  /** First paragraph used when the same prompt is asked again or retried, so a new version reads differently. */
  retryLead?: string;
}

const FENCE = "```";

const addColumn: ScriptedReply = {
  id: "add-column",
  match: /not null|non-null|nonnull|add (a |the )?(\w+ )?column|without (blocking|downtime|locking)/i,
  title: "Add region to orders",
  reasoning: "A NOT NULL column with no default fails on existing rows, and setting it on a filled column scans 40M rows under an exclusive lock. Safer path: nullable column, batched backfill, a NOT VALID check, validation under a weaker lock, then SET NOT NULL, which can skip the scan. Confirm the lock levels in the docs.",
  seconds: 4,
  tool: { id: "search", name: "Searched the web", activeName: "Searching the web", status: "done", summary: "4 sources", icon: "search", input: ["postgres 17 set not null without table scan", "validate constraint lock level"] },
  sources: [alterTable, locking, strongMigrations, lockTimeout],
  text: `Split it into four short steps, so no single statement holds a heavy lock for long.

1. **Add the column as nullable.** With no default, this only touches the catalog and returns at once.
2. **Backfill in batches** of about 5,000 rows, committing each batch so transactions stay short and autovacuum keeps up.
3. **Add a \`NOT VALID\` check, then validate it.** Validation scans the table under a \`SHARE UPDATE EXCLUSIVE\` lock, so reads and writes keep flowing. [1][2]
4. **Set \`NOT NULL\`.** Postgres sees the validated check and skips the full scan, so this lock lasts milliseconds. [1][3]

${FENCE}sql
ALTER TABLE orders ADD COLUMN region text;

ALTER TABLE orders ADD CONSTRAINT orders_region_not_null
  CHECK (region IS NOT NULL) NOT VALID;

ALTER TABLE orders VALIDATE CONSTRAINT orders_region_not_null;
ALTER TABLE orders ALTER COLUMN region SET NOT NULL;
ALTER TABLE orders DROP CONSTRAINT orders_region_not_null;
${FENCE}

Run each \`ALTER\` with a short \`lock_timeout\`, such as \`2s\`, so a statement stuck behind a long query gives up instead of queueing every write behind it. [4]`,
  retryLead: "Do it in four steps, each holding a heavy lock for only a moment.",
};

const estimate: ScriptedReply = {
  id: "estimate",
  match: /how long|estimate|backfill take|per batch|duration/i,
  title: "Backfill estimate",
  reasoning: "Use the real row count rather than the planner estimate, then multiply the batch count by a realistic time per batch, including a pause for the replicas.",
  seconds: 2,
  tool: { id: "count", name: "Queried orders", activeName: "Querying orders", status: "done", summary: "40,213,880 rows", icon: "database", ...PG, input: ["SELECT count(*) FROM orders;"], output: "40,213,880" },
  text: `About 23 minutes. The table has 40,213,880 rows, so 5,000 rows per batch makes 8,043 batches.

- **Per batch:** about 120 ms for the update and a 50 ms pause so replicas keep up
- **Total:** 8,043 × 170 ms ≈ 1,367 s, or just under 23 minutes
- **Lag:** if replication lag passes 5 s, double the pause instead of shrinking the batch

Walk the primary key in ranges, so every batch uses the index and never rescans finished rows:

${FENCE}sql
UPDATE orders o
SET region = c.region
FROM customers c
WHERE c.id = o.customer_id
  AND o.id >= $1 AND o.id < $1 + 5000
  AND o.region IS NULL;
${FENCE}`,
  retryLead: "Just under 23 minutes, at about 170 ms for each of the 8,043 batches.",
};

const lag: ScriptedReply = {
  id: "lag",
  match: /\blag\b|replica/i,
  title: "Replication lag",
  reasoning: "Read the replay delay on the replica itself, then compare it with the threshold the backfill should pause at.",
  seconds: 2,
  tool: { id: "lag", name: "Queried replica-eu-2", activeName: "Querying replica-eu-2", status: "done", summary: "0.4 s behind", icon: "database", ...PG, input: ["SELECT now() - pg_last_xact_replay_timestamp() AS lag;"], output: "00:00:00.412" },
  failFirst: "Could not reach replica-eu-2. The connection timed out after 10 seconds.",
  text: `replica-eu-2 is **0.4 seconds** behind the primary, well inside a safe range for a batched backfill.

- **Replay lag:** 0.4 s
- **Received but not replayed:** 2.1 MB of WAL
- **Rule of thumb:** pause the backfill when lag passes 5 s, and resume once it drops under 1 s`,
};

const rollback: ScriptedReply = {
  id: "rollback",
  match: /roll ?back|undo|revert/i,
  title: "Rollback plan",
  reasoning: "Each step is reversible on its own, and the column can stay until the app stops reading it.",
  seconds: 2,
  text: `Each step can be undone on its own, and none of them loses data.

1. **Before \`SET NOT NULL\`:** drop the check constraint. Writes never noticed it.
2. **After \`SET NOT NULL\`:** run \`ALTER COLUMN region DROP NOT NULL\`, which is instant.
3. **The column itself:** leave it in place until the app stops reading it, then drop it in a later release.

Keep \`region IS NULL\` in the backfill's \`WHERE\` clause, so a rerun after a rollback only touches the rows it missed.`,
  retryLead: "Every step is reversible, and you can undo them in reverse order without losing data.",
};

const index: ScriptedReply = {
  id: "index",
  match: /index/i,
  title: "Index on region",
  reasoning: "A plain CREATE INDEX blocks writes for the whole build. CONCURRENTLY avoids that at the cost of a slower build.",
  seconds: 3,
  tool: { id: "search-index", name: "Searched the web", activeName: "Searching the web", status: "done", summary: "1 source", icon: "search", input: ["postgres 17 create index concurrently"] },
  sources: [createIndex],
  text: `Build it with \`CREATE INDEX CONCURRENTLY\`, so writes keep flowing while it builds. [1]

${FENCE}sql
CREATE INDEX CONCURRENTLY orders_region_idx ON orders (region);
${FENCE}

It takes longer than a normal build and cannot run inside a transaction block. If it fails, it leaves an invalid index behind: drop it and run the build again.`,
};

const fallback: ScriptedReply = {
  id: "verify",
  match: /$^/,
  title: "",
  reasoning: "This preview only knows the orders migration, so answer with the step that usually comes next: checking the backfill before release.",
  seconds: 1,
  text: `In this preview I only know the \`orders\` migration, so here is the step that usually comes next: check the backfill before you ship.

${FENCE}sql
SELECT count(*) FROM orders WHERE region IS NULL;

SELECT conname, convalidated FROM pg_constraint
WHERE conrelid = 'orders'::regclass;
${FENCE}

You want zero rows without a region, and \`convalidated\` set to true for the check.`,
};

const replies = [lag, rollback, index, estimate, addColumn];
const pick = (prompt: string) => replies.find(reply => reply.match.test(prompt)) ?? fallback;

/** The title a scripted reply gives a new conversation, or a trimmed prompt. */
export function titleFor(prompt: string) {
  const scripted = pick(prompt).title;
  if (scripted) return scripted;
  const words = prompt.replace(/[`*?.!]+/g, "").trim().split(/\s+/).slice(0, 6).join(" ");
  return words.length > 40 ? `${words.slice(0, 38)}…` : words || "New chat";
}

export const demoPrompts = [
  "We need a non-null `region` column on our 40M row `orders` table in Postgres 17. How do we add it without blocking writes?",
  "How long will the backfill take at 5,000 rows per batch?",
];

export const sampleSuggestions: ChatSuggestion[] = [
  { label: "Add a NOT NULL column without downtime", prompt: "How do I add a NOT NULL column to a 40M row table without blocking writes?", icon: "database" },
  { label: "Estimate a backfill for 40M rows", prompt: "How long will a backfill of 40M rows take at 5,000 rows per batch?", icon: "timer" },
  { label: "Check replication lag on replica-eu-2", icon: "activity" },
];

export interface AiChatHistoryItem {
  id: string;
  title: string;
  /** Group heading in the chat menu, such as "Today" or "Previous 7 days". */
  group?: string;
  messages: AiChatMessage[];
}

/** Earlier conversations for the chat menu. They open settled, at their latest message. */
export const sampleHistory: AiChatHistoryItem[] = [
  {
    id: "partition-events", title: "Partition the events table", group: "Today",
    messages: [
      { role: "user", content: "Should we partition `events` by month or by week? It grows by about 90M rows a month." },
      { role: "assistant", model: "claude-opus-5-5", thoughtFor: 3, reasoning: "At 90M rows a month the main costs are vacuum time and retention deletes. Monthly partitions keep both cheap without a large partition count.", content: `By month. At about 90M rows a month, each partition stays small enough for quick vacuums and index builds, and the partition count stays low.

- **Retention:** dropping a month is one \`DETACH PARTITION\` and a \`DROP TABLE\`, with no bulk delete
- **Queries:** filters on \`created_at\` prune to one or two partitions
- **Weekly** partitions only pay off once a single month gets slow to vacuum` },
    ],
  },
  {
    id: "status-page", title: "Status page incident draft", group: "Previous 7 days",
    messages: [
      { role: "user", content: "Draft a status page update for the checkout slowdown on October 14. It was resolved at 15:40 UTC." },
      { role: "assistant", model: "claude-sonnet-5-5", thoughtFor: 2, reasoning: "Lead with the impact and the time window, say plainly that no payment was lost, then the cause and the fix.", content: `**Resolved: slower checkout**

Between 14:55 and 15:40 UTC on October 14, some customers saw checkout take longer than usual. No payment was lost or charged twice. A database migration held a lock for longer than expected; we stopped it, and checkout recovered at 15:40 UTC.

We are adding lock timeouts to every migration, so a schema change cannot hold up checkout again.` },
    ],
  },
  {
    id: "churn-themes", title: "Churn interview themes", group: "Previous 7 days",
    messages: [
      { role: "user", content: "Summarize the themes from the 12 churn interviews in three bullets." },
      { role: "assistant", model: "gpt-6-1-sol", thoughtFor: 5, reasoning: "Group the notes by the reason each customer gave first, then count how many interviews mention each.", content: `- **Setup took too long:** 7 of 12 never finished connecting their data in the first week
- **Pricing jumped at 10 seats:** 4 left at renewal when the team plan started
- **Exports were missing:** 3 needed CSV exports for finance and moved to a tool that had them` },
    ],
  },
];

/* Scripted responder ---------------------------------------------------------------------------------------------- */

const wait = (ms: number, signal: AbortSignal) => new Promise<void>(resolve => {
  if (signal.aborted) return resolve();
  const timer = setTimeout(done, ms);
  function done() { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); }
  signal.addEventListener("abort", done, { once: true });
});

/** Cuts text into pieces of about `size` characters at spaces, the way a network stream arrives. */
function pieces(text: string, size: number) {
  const out: string[] = [];
  let at = 0;
  while (at < text.length) {
    let end = Math.min(text.length, at + size);
    const space = text.indexOf(" ", end);
    end = space === -1 || space - end > 12 ? end : space + 1;
    out.push(text.slice(at, end));
    at = end;
  }
  return out;
}

/**
 * A scripted responder for previews: it streams reasoning, runs a tool, then streams markdown faster than the reveal clock
 * shows it, like a real network. Asking the same thing twice returns a reworded version. Nothing leaves the browser.
 */
export function createSampleResponder(): ChatRespond {
  const attempts = new Map<string, number>();
  return async function* respond(messages, { signal }) {
    const prompt = [...messages].reverse().find(message => message.role === "user")?.content ?? "";
    const reply = pick(prompt);
    const attempt = attempts.get(reply.id) ?? 0;
    attempts.set(reply.id, attempt + 1);

    for (const delta of pieces(reply.reasoning, 34)) {
      await wait(110, signal);
      if (signal.aborted) return;
      yield { type: "reasoning", delta };
    }
    yield { type: "reasoning-end", seconds: reply.seconds };

    if (reply.tool) {
      yield { type: "tool", tool: { ...reply.tool, status: "running", summary: undefined, output: undefined } };
      await wait(reply.failFirst && attempt === 0 ? 1400 : 850, signal);
      if (signal.aborted) return;
      if (reply.failFirst && attempt === 0) {
        yield { type: "tool", tool: { ...reply.tool, status: "error", name: reply.tool.activeName ?? reply.tool.name, summary: "Timed out", output: undefined } };
        yield { type: "error", message: reply.failFirst };
        return;
      }
      yield { type: "tool", tool: { ...reply.tool, sources: reply.sources } };
    }
    if (reply.sources) yield { type: "sources", sources: reply.sources };

    const text = attempt > 0 && reply.retryLead ? reply.text.replace(/^[^\n]+/, reply.retryLead) : reply.text;
    await wait(120, signal);
    for (const delta of pieces(text, 42)) {
      if (signal.aborted) return;
      yield { type: "text", delta };
      await wait(18, signal);
    }
  };
}
