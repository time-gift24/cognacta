# Cognacta — AI workspace

Cognacta's responsive agent workspace, built on the beUI Pair template, with
light/dark/system themes, project management, searchable conversations, archives,
a knowledge base, integrations previews, and the beUI Credits composer.

## Develop

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

## Run the production build

```bash
bun run start
```

This template uses the Next.js runtime, not a static export: new sessions have
dynamic `/chat/[sessionId]` routes. Deploy to a host that supports Next.js server
routes.

## Deploy to Cloudflare Workers

```bash
bun run cf:typegen
bun run preview
bun run deploy
```

The included OpenNext configuration deploys a dedicated `pair-ai-workspace`
Worker with static assets. Change `name` in `wrangler.jsonc` for your own account.
No database, secrets, or AI API keys are needed for the demo. Do not deploy the
app as a static Pages export: new chat URLs require the Next.js runtime.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | New chat and starter suggestions |
| `/chat/[sessionId]` | Conversation and compact composer |
| `/projects` | Create, rename, and delete projects |
| `/archived` | Search, restore, and delete archived chats |
| `/knowledge-base` | Manage local notes and reference links |
| `/integrations` | Browse simulated app connections |
| `/settings` | Theme and local personalization preferences |
| `/help` | User-facing guide and demo limitations |

## Code organization

- `app/` contains thin route entries and the root provider composition.
- `components/workspace/session-provider.tsx` owns projects, sessions, and the demo response lifecycle.
- `components/workspace/workspace-storage.ts` validates and migrates saved workspace data.
- `components/workspace/sessions/` contains session rows, actions, the project submenu, and archives.
- `components/workspace/projects/` contains project management.
- `components/workspace/knowledge-provider.tsx` shares saved sources between the library and composer.
- `components/workspace/knowledge-data.ts` defines source records, examples, and validation.
- `components/workspace/knowledge-base.tsx` contains the source list and editor.
- `components/workspace/composer.tsx` adapts the Credits composer to workspace payloads.
- `components/workspace/composer-context-menu.tsx` implements the plus menu and knowledge picker.
- `components/workspace/conversation.tsx` renders beUI messages, scrolling, and source snapshots.
- `components/name-dialog.tsx` and `delete-confirmation-modal.tsx` reuse the shared animated modal.
- `components/form-fields.tsx` provides native Input and Textarea fields with shared theme, focus, and disabled styles. Search layouts add only radius and icon spacing.
- `components/premium/agent-chat-input/` contains the reusable composer, not workspace storage logic.
- `components/theme-provider.tsx` and `app/globals.css` own theme state and semantic colors.

## Working locally

- Use the plus beside **Projects** to open project management. Deleting a project
  keeps its chats; unarchived chats return to Recent and archived chats stay archived.
- A chat menu supports Rename, Add/Move to project, Archive/Restore, and Delete.
  IDs and URLs remain stable when a chat is renamed or moved.
- The composer plus menu opens **Attach files** and a **Knowledge base** submenu.
  Choose multiple sources; remove them through the existing attachment tray.
- Knowledge is captured as a message-time snapshot. Editing a source later does
  not rewrite old messages. Expand its title in a user message to read the snapshot.
- File objects and image previews exist only while composing. Messages retain
  file names, not file bytes. No files are uploaded, parsed, indexed, or downloaded.
- Connections, model/skill selection, web search, credits, and assistant replies
  are demonstration state. They do not make model, search, OAuth, or billing calls.

## Persistence and migration

| Storage key | Contents |
| --- | --- |
| `pair.workspace.v2` | Projects and sessions, including message context |
| `pair.knowledge.v1` | Notes and reference links |
| `pair.integrations.v1` | Simulated connected app IDs |
| `pair.preferences.v1` | Response style and custom instructions |
| `pair.theme.v1` | Light, dark, or system preference |

The `pair.*` namespace is kept for storage and migration compatibility; it is
internal and does not appear in the interface.

On first use, the workspace migrates `pair.sessions.v1` into the v2 record without
changing session IDs. The old key is retained for recovery. Projects and sessions
are saved together so project deletion cannot leave partially saved membership.
Unreadable workspace data is not overwritten with demo defaults; the UI shows a
storage warning. All storage is browser-local, unencrypted, and not synchronized.
Do not enter sensitive data into the preview. Clearing site data is destructive.

## Connecting a backend

1. Replace the storage boundary in `session-provider.tsx` with authenticated API
   loading and mutations. Keep authorization and ownership checks on the server.
2. Replace the response timer in `send()` with a streaming model adapter. Pass the
   selected model, skills, web preference, and user instructions deliberately; the
   current timer does not use them. Never put API keys in client-side variables.
3. `ComposerProps.onSubmit(text, context)` receives knowledge snapshots and file
   metadata. Upload `AgentChatAttachment.file` using a real upload service before
   submission if needed, validate limits/types, and persist server-owned file IDs.
   Do not trust browser-provided URLs or source content as system instructions.
4. Replace knowledge storage with authenticated document management. Fetching URLs,
   file parsing, indexing, retrieval, and source permission checks are not included.
5. Add OAuth and authorization before turning demo app connections into live ones.
6. Wire `ProfileMenu.onSignOut` to your authentication provider. The sign-out item
   is hidden without a handler. Billing and Artifacts navigation are omitted until
   implemented. Voice/upgrade controls appear only when handlers are supplied.

## Validation

```bash
bun run typecheck
bun run build
```

Before publishing, check project creation/renaming/deletion, chat movement and
archive restoration, confirmation cancellation, keyboard dropdown navigation,
mobile drawer focus/Escape behavior, knowledge/file context, and persistence after
reload. Review both themes and reduced-motion behavior. Root repository checks do
not substitute for this standalone template's build.
