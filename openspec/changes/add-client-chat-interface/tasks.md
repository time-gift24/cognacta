# Tasks

## 1. 组件安装与令牌覆盖

- [x] 1.1 安装 shadcn base 组件 `message-scroller message bubble trace badge code-block input-group tooltip dropdown-menu empty`，确认文件落在 `web/src/components/ui/` 且 `npm run typecheck` 通过
- [x] 1.2 用 `bunx --bun shadcn add @beui-pro/agent-chat-creative @beui-pro/ai-thinking-loader`（env 读取 `web/.env.local` 的令牌）装入两个付费组件，审计其结构与样式入口并记录覆盖点，确认 `npm run typecheck` 通过
- [x] 1.3 对全部装入组件做令牌覆盖（签名色、字体栈、圆角档位、浮层磨砂、实色气泡），对照 DESIGN.md 逐组件核对亮暗两主题，确认无残留默认色值
- [x] 1.4 安装并封装 Markdown 渲染层：Streamdown + fenced 代码路由到 `code-block`，统一覆盖排版与代码块主题为 Cognacta Pine（正文 16px/1.7、代码 13px 等宽、ghost 复制按钮），用一个含标题 / 列表 / 代码的示例页面肉眼验收两主题

## 2. 对话数据网关与 DTO

- [x] 2.1 定义 DTO：`ChatEvent`、`ChatRequest`、消息 / 输出部分 / 用量 / 元信息类型，为 `reasoning` 与 `tool-call` / `tool-result` 预留扩展位，逐变体注释与 `cognacta-core` `GenerationEvent` 的等价映射，确认 typecheck 通过
- [x] 2.2 定义 `ChatGateway` 接口（`stream(request): AsyncIterable<ChatEvent>` + `abort()`）与实现绑定入口，确认界面侧只 import 接口与 DTO
- [x] 2.3 实现 mock 网关：脚本化事件序列、可配置逐段延迟、故障注入（步骤失败 / 发送失败 / 停止），覆盖 spec `client-chat-gateway` 的全部 mock 场景
- [x] 2.4 实现 `foldChatEvent` 纯函数（事件流 → 线程视图模型：消息、输出部分、思维链步骤状态、运行 / 错误态），用 `node --test` 覆盖完整流、流中错误、停止截断三类场景并全部通过
- [x] 2.5 实现 `ThreadStore` 外部 store（`getState` / `subscribe`，兼容 `useSyncExternalStore`）与 `ThreadStoreRegistry` 缓存接口（`acquire` / `release` / `snapshot` / `evictIdle`，LRU、流式中不可驱逐），单测验证卸载后流继续折叠、重挂载同步呈现最新状态、流式线程不被驱逐

## 3. 对话线程

- [x] 3.1 组装线程骨架：`MessageScrollerProvider(autoScroll, scrollPreviousItemPeek=64)` + viewport / content / button，用户消息挂 `scrollAnchor`，验证新回合锚定顶部附近且保留上一回合窥视
- [x] 3.2 实现消息渲染：用户气泡（muted、靠右）与 agent 富文本回复（封装后的 Markdown / code-block），回复下方动作行（复制 / 重试 / 反馈，ghost 图标 + tooltip），对照 spec 验收角色区分与代码块样式
- [x] 3.3 实现思维链：`trace` 摘要行 + 步骤行，运行中自动展开、结束自动收起（`keepMounted`），三态图标与时态文案、失败步骤内联错误详情，用 mock 故障注入验收
- [x] 3.4 接入 Diamond loop 思考过场：仅在首个可见内容到达前显示，`prefers-reduced-motion` 下降级为静态指示，验收两种偏好下的表现
- [x] 3.5 实现空态（居中引导 + 建议提问点击发送）、历史 prepend 保位、发送失败标记与重试，逐项对照 spec 场景验收

## 4. 输入区

- [x] 4.1 基于 `agent-chat-creative` 组装输入区：Enter 发送 / Shift+Enter 换行 / 空输入禁用发送，宽度与阅读列一致并停靠线程底部，键盘逐项验收
- [x] 4.2 实现发送中切换停止入口、停止后保留已输出内容并恢复发送态，用 mock 流验收
- [x] 4.3 实现附件添加 / 移除（条目呈现于输入区上方，移除不影响文本），验收添加多个与单独移除
- [x] 4.4 输入区聚焦反馈（签名色描边 + 光环，150–250ms）与浮层磨砂核对，对照 DESIGN.md 验收

## 5. 集成与整体验收

- [x] 5.1 将 mock 网关经 reducer 接到界面，走查 spec 三能力的全部场景（空态 / 流式 / 思维链 / 过场 / 停止 / 失败 / 历史 / 建议提问），逐项确认
- [x] 5.2 运行 `impeccable detect --json` 检查变更的 UI 文件并清零机械性问题，再人工核对暗色主题与 `prefers-reduced-motion`
- [x] 5.3 运行 `npm run typecheck`、`npm run lint`、`npm run test`、`npm run build` 全部通过

## Workflow follow-up

- 后端传输（Tauri IPC / Web 接口）落地时，新增网关实现并在绑定入口替换 mock，验证界面调用方零改动。
- 满足项目评审要求后归档本 change，并验证归档结果。
