# Cognacta — Agent workspace

Cognacta's responsive agent workspace, built on the Arc component system
(uiarc) with a Cognacta Canopy color system, light/dark/system themes, a
frosted composer and overlay layers, project management, searchable
conversations, archives, a knowledge base, integrations previews, and the
existing Credits composer.

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

The included OpenNext configuration deploys a dedicated `cognacta-web`
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

## Localization

The workspace defaults to Chinese (`zh`) and ships an English (`en`) mirror.
[next-intl](https://next-intl.dev) loads messages from `messages/zh.json` and
`messages/en.json`; `i18n/request.ts` reads the `cognacta.locale` cookie, so
there is no locale URL prefix and every deep link keeps its path. Switch the
language in **Settings → Appearance → Language**. Server components re-render on
switch, and untouched demo content is re-seeded in the new language.

## Code organization

- `app/` contains thin route entries and the root provider composition.
- `components/workspace/session-provider.tsx` owns projects, sessions, and the demo response lifecycle.
- `components/workspace/workspace-storage.ts` validates and migrates saved workspace data.
- `components/workspace/mock-threads.ts` provides the bilingual multi-turn demo conversations with reasoning, tools, and sources.
- `components/workspace/sidebar.tsx` owns the Arc-style workspace sidebar: the folding rail, live filter, pinned rows, project tree, mobile sheet, storage meter, and announcements.
- `components/workspace/sidebar-rows.tsx` contains the rail-aware navigation rows, draggable pinned rows, project groups, and the inline project composer.
- `components/workspace/sidebar-menu.tsx` composes the Arc menu primitives for the workspace and account menus.
- `components/workspace/use-pinned-sessions.ts` persists pinned chats and their order; `use-storage-usage.ts` powers the footer meter.
- `components/workspace/sessions/` contains session actions and archives.
- `components/workspace/projects/` contains project management.
- `components/arc/` contains the Arc components used by the workspace: search field, avatar, badge, animated counter, text morph, menu, dialog, input, button, and tooltip.
- `components/workspace/knowledge-provider.tsx` shares saved sources between the library and composer.
- `components/workspace/knowledge-data.ts` defines source records, examples, and validation.
- `components/workspace/knowledge-base.tsx` contains the source list and editor.
- `components/workspace/composer.tsx` adapts the Credits composer to workspace payloads.
- `components/workspace/composer-context-menu.tsx` implements the plus menu and knowledge picker.
- `components/workspace/arc-conversation.tsx` binds the uiarc AI chat thread to workspace sessions and the shared composer.
- `components/name-dialog.tsx` and `delete-confirmation-modal.tsx` now open the shared Arc dialog and input, with the same call sites used by projects and the knowledge base.
- `components/form-fields.tsx` provides native Input and Textarea fields with shared theme, focus, and disabled styles. Search layouts add only radius and icon spacing.
- `components/premium/agent-chat-input/` contains the reusable composer, not workspace storage logic. The composer is intentionally unchanged in this pass; navigation, menus, dialogs, and the sidebar are Arc.
- `components/theme-provider.tsx` and `app/globals.css` own theme state and semantic colors.

## Working locally

- Press `[` anywhere outside a text field, menu, or nested dialog to fold the
  sidebar into its 64px icon rail. On a phone the same key opens or closes the
  sheet. The rail preference is stored in a cookie, so it survives a reload.
  The rail names every icon on hover and focus.
- Below 640px the same sidebar opens as a sheet from the top-left button. It
  traps Tab, closes on Escape, a backdrop press, or a left swipe, and returns
  focus to the opener.
- The search field filters navigation, pinned chats, projects, and recent chats
  live, highlights the matching letters, and announces the result count. Press
  Enter to open the first match. ⌘K still opens the global command palette.
- Hover a chat and open its menu to pin it. Pinned chats sit above projects,
  support drag or `Alt` with the arrow keys to reorder, and keep their order.
- Use **New project** in the sidebar to create one in place. Open **Manage
  projects** from the workspace or account menu to rename or delete projects.
  Deleting a project keeps its chats; unarchived chats return to Recent and
  archived chats stay archived. Every project row also opens to a nested
  **New chat** action.
- A chat menu supports Rename, Pin/Unpin, Add/Move to project, Archive/Restore, and Delete.
  IDs and URLs remain stable when a chat is renamed or moved.
- The composer plus menu opens **Attach files** and a **Knowledge base** submenu.
  Choose multiple sources; remove them through the existing attachment tray.
- Knowledge is captured as a message-time snapshot. Editing a source later does
  not rewrite old messages. Expand its title in a user message to read the snapshot.
- File objects and image previews exist only while composing. Messages retain
  file names, not file bytes. No files are uploaded, parsed, indexed, or downloaded.
- Connections, model/skill selection, web search, credits, and assistant replies
  are demonstration state. They do not make model, search, OAuth, or billing calls.

## Persistence

| Storage key | Contents |
| --- | --- |
| `cognacta.workspace.v3` | Projects and sessions, including message context and rich reply metadata |
| `cognacta.knowledge.v1` | Notes and reference links |
| `cognacta.integrations.v1` | Simulated connected app IDs |
| `cognacta.preferences.v1` | Response style and custom instructions |
| `cognacta.theme.v1` | Light, dark, or system preference |
| `cognacta.sidebar.pins.v1` | Pinned chat IDs in display order |
| `cognacta.sidebar.rail` (cookie) | Whether the desktop sidebar starts folded |

All keys use the `cognacta.*` namespace. The selected language is stored in the
`cognacta.locale` cookie, not in local storage. Projects and sessions are saved
together so project deletion cannot leave partially saved membership. Pinned
chat IDs are kept separately and pruned when a chat no longer exists.
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
6. Add sign-out to `components/workspace/sidebar-menu.tsx` when authentication
   exists; the current account menu is local-only. Billing and Artifacts
   navigation are omitted until implemented. Voice/upgrade controls appear only
   when handlers are supplied.

## Validation

```bash
bun run typecheck
bun run build
```

Before publishing, check project creation/renaming/deletion, chat movement and
archive restoration, confirmation cancellation, keyboard dropdown navigation,
rail folding with `[`, live search and first-result Enter, pin drag and
`Alt`+arrow reorder, mobile sheet focus/Escape/swipe/resize behavior,
knowledge/file context, and persistence after reload. Review both themes and
reduced-motion behavior. Root repository checks do not substitute for this
standalone template's build.
