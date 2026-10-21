# Design

## Context

`web/` 是 Vite + React 19 + Tailwind 4 的 shadcn 工程（radix-nova 风格），现有界面只有 `SidebarRail` 外壳；设计令牌已按 DESIGN.md 落到 `src/index.css` 的 CSS 变量，动效弹簧在 `src/lib/ease.ts`。shadcn 注册表已配置官方源与 beui-pro 付费源（令牌在 `web/.env.local`）。后端侧，`cognacta-core` 已定义流式契约 `GenerationEvent`（Started / PartStarted / Delta / PartCompleted / Usage / Completed，错误以 `Err` 终止流），但当前 `PartKind` 仅有 `Text`，尚无推理与工具调用事件；`add-provider-streaming-chat` 也只交付文本流。动机见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 对话界面三件套（线程 / 输入区 / 数据网关）一次组装到位，视觉完全符合 Cognacta Pine 令牌。
- 网关接口与 DTO 是前端自有契约：mock → Tauri IPC / Web 接口的切换只改实现绑定，不改调用方。
- 事件流折叠逻辑与渲染分离，可无浏览器单测。

**Non-Goals:**

- 不接真实后端，不实现 Tauri IPC / Web 传输（仅保证接口形状兼容）。
- 不做会话列表与线程切换 UI、不做缓存持久化（本轮只定义缓存接口与内存实现）。
- 不改 Rust crates、`SidebarRail` 及 DESIGN.md / PRODUCT.md / CONTEXT.md。

## Decisions

### D1: 组件全部来自注册表，禁止自写滚动与通用控件

线程滚动用官方 `message-scroller`（锚定回合、跟随边缘、prepend 保位、`role="log"` 等十五项流式滚动行为已内建），消息用 `message` + `bubble`，思维链按官方 chain-of-thought 模式用 `trace` + `badge` + `code-block` 组合，输入区用 `@beui-pro/agent-chat-creative`，思考过场用 `@beui-pro/ai-thinking-loader` 的 Diamond loop。备选「自写滚动容器」被否：流式滚动纪律（阅读者意图优先）是高风险细节，自写必然欠账。

装入后统一做一轮令牌覆盖（类名层面改，不 fork 组件逻辑）：松绿签名色只给发送按钮与激活态，气泡实色、浮层磨砂、字体栈、圆角档位按 DESIGN.md。beui-pro 组件源码装入前不可预览，装入后先审计其结构与样式入口再覆盖。

### D2: 自建网关接口 + DTO，不引入 AI SDK 的 useChat

网关接口形状（TypeScript，命名前端自定）：

```ts
interface ChatGateway {
  stream(request: ChatRequest): AsyncIterable<ChatEvent>
  abort(): void
}
```

`ChatEvent` 与 `GenerationEvent` 当前等价，映射显式声明：

| 后端 `GenerationEvent` | 前端 `ChatEvent` |
| --- | --- |
| `Started(GenerationMetadata)` | `Started(metadata)`（provider / protocol / 请求与解析模型、请求 ID） |
| `PartStarted { part, kind }` | `PartStarted { partId, kind }` |
| `Delta { part, delta: Text }` | `Delta { partId, text }` |
| `PartCompleted { part, content }` | `PartCompleted { partId, content }` |
| `Usage(...)` | `Usage(...)`（输入 / 输出 / 推理 / 缓存 token 均可缺省） |
| `Completed(GenerationResponse)` | `Completed(response)`（完整 AssistantMessage、FinishReason、用量、元信息） |
| 流以 `Err` 终止 | `Failed(error)`（分类 + 诊断信息） |

备选「`@ai-sdk/react` 的 `useChat` + 自定义 transport」被否：它把 AI SDK 的 `UIMessage` 形状渗进 UI 状态，违背「DTO 独立演进、传输可换」的目标，且停止 / 重试语义要被 AI SDK 的状态机再包一层。

DTO 的 `PartKind` 预留 `reasoning` 与 `tool-call` / `tool-result` 扩展位（后端尚未产出，映射注释标明「当前等价、扩展位为前瞻设计」）；思维链 UI 的步骤数据由 mock 以扩展位产出。这样后端落地工具事件时只扩展适配层，UI 不动。

### D3: 外部 store + `useSyncExternalStore`，线程缓存接口一次定义到位

`foldChatEvent(state, event)` 纯函数把事件流折叠为线程视图模型（消息、输出部分、思维链步骤状态、运行 / 错误态），与渲染分离，`node --test` 单测覆盖完整流、流中错误、停止截断三类场景。

持有状态的方案对比（背景：后续要支持丝滑切换线程，agent 在服务端运行、流不因界面切换而停）：

| | reducer + context | 外部 store + `useSyncExternalStore` |
| --- | --- | --- |
| 状态生命周期 | 绑在 React 树内；多线程缓存需把 `Record<ThreadId, State>` 提升到根，等于在 React 里重造外部 store | 天然在 React 外，每线程一个 store 实例，注册表持有 |
| 未挂载线程的流 | 组件卸载后事件无处折叠，靠提升到根才能续流，语义别扭 | 卸载后 store 继续折叠事件，切回时同步渲染最新状态 |
| 流式高频更新 | 每条 delta 经 context 广播，选择器拆分繁琐 | selector 订阅精确控制重渲染粒度 |
| 切换闪烁 | 需额外处理 | 缓存命中即同步渲染，无 loading 态 |

决策：**每线程一个外部 store，React 侧 `useSyncExternalStore` 订阅；reducer 只作为 store 内部实现细节**。缓存接口本轮定义并实现内存版，持久化留后续：

```ts
// 线程的视图状态：foldChatEvent 的产出，不可变，每次事件整体替换
interface ThreadViewState {
  threadId: ThreadId
  status: "idle" | "streaming" | "failed"
  messages: ThreadMessage[]   // 用户消息 + agent 回复（含思维链步骤部分）
  error?: ChatError
}

// 每个线程一个 store 实例：持有状态、拥有该线程的网关订阅生命周期
interface ThreadStore {
  getState(): ThreadViewState                  // useSyncExternalStore 的 snapshot 源
  subscribe(listener: () => void): () => void  // useSyncExternalStore 的订阅协议
  send(text: string, attachments?: AttachmentRef[]): void // 乐观追加用户消息 + 消费 gateway.stream
  stop(): void                                 // 唯一会调用 gateway.abort() 的入口
  retry(messageId: string): void
}

// 可 JSON 序列化的 ThreadViewState + schema 版本，本轮仅内存，供日后持久化 / 水合
type ThreadSnapshot = { version: 1; state: ThreadViewState }

interface ThreadStoreRegistry {
  acquire(threadId: ThreadId): ThreadStore                 // 命中缓存或懒创建，引用计数 +1
  release(threadId: ThreadId): void                        // 引用计数 -1，归零后可驱逐
  snapshot(threadId: ThreadId): ThreadSnapshot | undefined // 序列化视图状态，供日后持久化
  evictIdle(maxIdle?: number): void                        // LRU 驱逐空闲线程
}
```

内部机制：store 由 `threadId` + `ChatGateway` 绑定构造；每条 `ChatEvent` 到达即 `state = foldChatEvent(state, event)` 并通知 listener。React 侧的使用方式：

```tsx
function ChatScreen({ threadId }: { threadId: ThreadId }) {
  const store = useThreadStore(threadId) // mount 时 registry.acquire，unmount 时 release
  const state = useSyncExternalStore(store.subscribe, store.getState)
  // 渲染 state.messages；输入区调 store.send / store.stop
}
```

使用流程：进入线程 → `acquire` 命中缓存或懒创建 → `useSyncExternalStore` 同步渲染当前状态（缓存命中即无加载闪烁）→ 离开线程 → `release` 引用归零，store 留在注册表，流继续折叠 → 返回线程 → 再次 `acquire`，立即拿到含离开期间全部内容的状态。日后做持久化时：驱逐 / 退出前写 `snapshot`，`acquire` 未命中时先用水合快照渲染、再向服务端校对。

纪律：`release` 不中止流（只有用户显式停止才 `abort`）；流式进行中的线程不可驱逐；本轮单线程界面也走 registry（固定一个 threadId），将来加切换 UI 时不动状态层。

### D4: Markdown 与代码块的样式在渲染层统一覆盖

回复正文用 Streamdown，fenced 代码路由到 shadcn `code-block`。Streamdown 的默认排版与代码块默认主题都在我们自己的渲染封装里按令牌覆盖（字号 16px / 1.7、代码 13px 等宽、复制按钮 ghost 样式），不直接散落使用库默认导出。

### D5: 动效与过场

思考过场 = ai-thinking-loader 的 Diamond loop，只出现在「用户消息之后、首个思维链步骤或正文之前」的占位处；面板 / 布局变化走 `SPRING_PANEL` / `SPRING_LAYOUT`，状态反馈走 150–250ms `EASE_OUT`；`prefers-reduced-motion` 下 Diamond loop 降级为静态图标 + 文案，弹簧降级为瞬时 / 淡入。

## Risks / Trade-offs

- [beui-pro 两个组件装入前看不到源码，风格覆盖成本未知] → 装入后先审计再覆盖；若结构不可控，退回到官方 `prompt-input` 基座自行组装，视觉目标不变。
- [后端暂无推理 / 工具事件，DTO 扩展位是前瞻设计] → 映射注释明确「当前等价部分」与「预留部分」；spec 只约束扩展位存在，不约束后端时序。
- [Streamdown / code-block 主题覆盖不彻底会漏出默认样式] → 完成后跑 impeccable detector 做一轮机械检查，再人工核对暗色主题。
- [mock 时序与真实流差异导致边界状态漏测] → mock 支持可配置延迟与故障注入（步骤失败、发送失败、停止），spec 场景全部由 mock 驱动验收。

## Open Questions

- Tauri IPC 与 Web 接口的最终事件编码（JSON 帧 / SSE / NDJSON）待后端定稿；网关接口以 `AsyncIterable` 抽象，编码决策不影响本 change。
