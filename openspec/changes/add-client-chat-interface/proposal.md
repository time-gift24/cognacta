# Proposal

## Why

客户端（web/ 前端，未来由 Tauri 承载）目前只有 SidebarRail 外壳，业务构建者没有与 agent 对话的主界面。需要交付客户端主对话界面——这是产品的核心交互面，同时把「对话数据网关」以接口 + DTO 的形式一次设计到位，使后续从 mock 切换到 Tauri IPC 或 Web 接口时前端业务代码零改动。

## What Changes

- 在 `web/` 新建客户端主对话界面 surface：头部（agent 身份与模型标识）+ 对话线程 + 底部停靠输入区，居中阅读列。
- 对话线程基于 shadcn `message-scroller` + `message` + `bubble` 组装：用户消息作为 `scrollAnchor`，`autoScroll` 跟随流式输出，保留上一回合窥视（peek）。
- 思维链按 shadcn ai-elements chain-of-thought 模式实现（`trace` + `badge` + `code-block` 组合）：摘要行可折叠，运行中自动展开、结束后收起，步骤区分进行中 / 完成 / 失败时态。
- 思考过场使用 `@beui-pro/ai-thinking-loader` 的 Diamond loop 动画。
- 输入区基于 `@beui-pro/agent-chat-creative` 组装。
- 回复正文用 Streamdown 渲染 Markdown，代码走 `code-block`；两者的视觉样式按 DESIGN.md（Cognacta Pine）令牌整体改风格。
- 所有装入的注册表组件按 DESIGN.md 令牌覆盖默认样式：松绿签名色、MiSans + Geist 字体、磨砂仅限浮层、弹簧动效沿用 `lib/ease.ts`。
- 定义前端对话数据网关接口与 DTO 层：DTO 与后端 `cognacta-core` 的 `GenerationEvent` 在语义上等价（字段一一对应），但类型独立命名，屏蔽后端契约的未来变化；首版提供 mock 实现（脚本化流式数据），接口形状保证后续切换到 Tauri IPC / Web 接口时调用方代码不变。
- 线程状态采用独立于 React 生命周期的外部 store（`useSyncExternalStore` 订阅），并定义线程缓存注册表接口（acquire / release / snapshot / LRU 驱逐），为后续丝滑切换线程铺路；本轮实现内存版，不做切换 UI 与持久化。
- 必备界面状态：空态（建议 prompt）、流式中、工具/步骤失败、发送失败、历史加载不跳位置；`prefers-reduced-motion` 降级。

## Capabilities

### New Capabilities

- `client-chat-thread`: 对话线程的呈现与流式滚动行为——消息、思维链、思考过场、Markdown / 代码块渲染与全部界面状态。
- `client-chat-composer`: 消息输入区——文本输入、附件、发送 / 停止与键盘行为。
- `client-chat-gateway`: 对话数据网关接口、与 `GenerationEvent` 等价的 DTO 层及 mock 实现，后续可替换为 Tauri IPC / Web 传输而不改调用方。

### Modified Capabilities

无。当前 `openspec/specs/` 尚无已发布能力规格。

## Impact

- 实施范围集中在 `web/` 前端（Vite + React 19 + Tailwind 4 + shadcn radix-nova），不改动 Rust crates、不改动 `SidebarRail` 与 `DESIGN.md` / `PRODUCT.md` / `CONTEXT.md`。
- 新增注册表组件来源：shadcn 官方 base 注册表（`message-scroller`、`message`、`bubble`、`trace`、`badge`、`code-block`、`input-group` 等）与 beui-pro 付费注册表（`agent-chat-creative`、`ai-thinking-loader`，令牌在 `web/.env.local`）。
- 新增运行期依赖预计包括 Streamdown（Markdown 流式渲染）及组件带入的依赖；具体版本在实施时按工程现状确认。
- DTO 字段对齐 `cognacta-core` 的 `GenerationEvent` / `GenerationResponse` / `Usage` / `GenerationMetadata`，但前端类型独立演进；后端契约变更只影响网关适配层。
- 本轮不接真实后端、不做会话列表与多 agent 切换（归后续 change）；设计文档 `docs/design/llm-provider-interface.md` 与 `add-provider-streaming-chat` 继续作为后端背景。
