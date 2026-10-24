/**
 * 触发词（写在消息文本里）：
 * - `[fail-send]`：提交即失败（网络错误），演示发送失败态。
 * - `[fail-step]`：检索代码步骤失败，演示思维链失败态。
 * - `[burst]`：停顿后成批输出长 Markdown；可在输出中点击停止。
 * - `[slow]`：逐段延迟放大 8 倍，演示停止按钮与长流。
 *
 * burst 的 partId 0-2 为步骤、3 为整篇正文，测试依赖该结构。
 */

import type { ChatGateway } from "@/chat/gateway.ts"
import type {
  ChatEvent,
  ChatRequest,
  ChatUsage,
  OutputContent,
} from "@/chat/dto.ts"

export interface MockGatewayOptions {
  /** 每个事件之间的基础延迟（ms），默认 45。 */
  delayMs?: number
}

const BUILD_REASONING = `**核对构建耗时**
先确认缓存键的构成，再核对部署日志里的耗时分布。

**定位缓存失效**
对比安装、编译和图片处理阶段，优先检查耗时最高的一段。`

const REPLY_INTRO = `先把问题拆成两半：缓存键不该包含提交哈希。

建议改为按图片目录键控：

\`\`\`ts
const cacheKey = \`img:\${dir}:\${process.env.CONTENT_HASH}\`
\`\`\`

这样同目录的图片在多次部署间共享缓存，构建时间从约 4 分钟降到 20 秒以内。`

const REPLY_SEG_1 = `## 先定位耗时，再调整缓存 🔍

${REPLY_INTRO}`

const REPLY_SEG_2 = `## 一次只改一个变量

先保留依赖安装和编译流程，只调整图片转换的缓存键。这样下一次部署的变化才有明确来源：如果图片阶段变快，说明命中了缓存；如果仍然很慢，就继续检查缓存的读写位置和失效条件。

把目录名、图片内容哈希和转换参数放进缓存键，避免不同尺寸、格式或质量的图片互相覆盖。提交哈希只用于关联这次部署，不参与决定相同图片能否复用。

\`\`\`ts
type ImageOptions = {
  width: number;
  quality: number;
  format: "webp" | "avif";
};

function imageCacheKey(
  directory: string,
  contentHash: string,
  options: ImageOptions,
) {
  return [
    "image-v1",
    directory,
    contentHash,
    options.width,
    options.quality,
    options.format,
  ].join(":");
}

const options = { width: 1280, quality: 82, format: "webp" } as const;
const key = imageCacheKey("hero", "a1b2c3", options);
\`\`\``

const REPLY_SEG_3 = `## 验证缓存是否真的生效

1. 第一次部署记录图片阶段耗时，作为冷缓存基线。
2. 不改图片，重新部署同一个页面，确认图片阶段使用已有结果。
3. 只改一张图片，确认只有这张图片重新转换。
4. 调整输出尺寸，确认不会错误复用之前的缩略图。

| 场景 | 预期行为 |
| --- | --- |
| 仅修改页面文字 | 图片缓存保持命中 |
| 修改一张原图 | 只重建这张图片 |
| 改变转换参数 | 使用新的缓存键 |
| 缓存暂时不可用 | 正常完成转换并返回结果 |

## 再检查边界条件

缓存目录需要跨构建保留。如果每次部署都会创建一个新的临时目录，即使缓存键完全相同，下一次构建也找不到之前的结果。先确认读取和写入使用同一个位置，再确认部署结束后文件没有被清理。

同一张原图可能同时生成缩略图、详情图和分享卡片。这些输出必须分别存储，但不必重复下载原图。可以先复用原始文件，再按尺寸和格式执行转换；当其中一个任务失败时，其他已经完成的输出仍然可以保留。

> 下面的数字仅为 mock 演示数据，用于观察长回复中的段落、表格和代码块。

| 构建轮次 | 原图数量 | 缓存命中 | 重新转换 | 图片阶段耗时 |
| --- | ---: | ---: | ---: | ---: |
| 首次构建 | 240 | 0 | 240 | 232 秒 |
| 重复构建 | 240 | 240 | 0 | 18 秒 |
| 更新一张图片 | 240 | 239 | 1 | 21 秒 |
| 新增输出尺寸 | 240 | 0 | 240 | 226 秒 |

## 给并发任务保留清晰的结果

转换完成后先写入临时文件，再原子替换目标文件，避免另一个任务读到只写了一半的内容。缓存读取失败时继续正常转换；缓存写入失败时仍然返回本次已经生成的图片，不把辅助存储问题变成整个构建的失败。

\`\`\`ts
const results = await Promise.allSettled([
  buildImage({ source: "hero.jpg", width: 640, format: "webp" }),
  buildImage({ source: "hero.jpg", width: 1280, format: "webp" }),
  buildImage({ source: "hero.jpg", width: 1280, format: "avif" }),
]);

for (const result of results) {
  if (result.status === "fulfilled") {
    publishImage(result.value);
  }
}
\`\`\`

## 保留可以对照的结果 ✅

最后分别记录冷缓存、热缓存和局部更新的构建时间。不要只看一次部署的总耗时：依赖下载、机器负载和网络抖动都会影响它。连续跑几次，比较图片阶段的中位数，才能判断缓存调整是否有效。

如果热缓存已经稳定命中，而总耗时仍没有明显下降，再检查编译阶段。先把最慢的一段改好，再决定下一步，避免同时修改多个环节后难以确认收益。`

const DEMO_REPLY = [REPLY_SEG_1, REPLY_SEG_2, REPLY_SEG_3].join("\n\n")

const BURST_REPLY = [
  DEMO_REPLY,
  ...[
    "首页首屏",
    "商品详情",
    "文章封面",
    "用户头像",
    "专题横幅",
    "搜索缩略图",
    "分类入口",
    "分享卡片",
    "移动端列表",
    "桌面端画廊",
    "活动海报",
    "推荐内容",
    "品牌标识",
    "帮助中心",
    "案例展示",
    "团队介绍",
    "视频封面",
    "作品预览",
    "历史归档",
    "多语言页面",
  ].map(
    (scene, index) => `## 第 ${index + 1} 组：${scene}的缓存回归

这一组单独检查「${scene}」使用的图片。先保持源文件和转换参数不变，连续执行两次构建，再修改其中一张原图。预期第二次构建直接复用结果，第三次只转换发生变化的文件；页面标题、描述和排序的变化不应让整组图片重新生成。

### 操作顺序

1. 清空本组演示缓存，记录首次构建的耗时和产物数量。
2. 保留源文件，重复构建，逐一核对图片尺寸、格式与内容哈希。
3. 修改一张图片，再检查其他图片的缓存是否仍然有效。
4. 在转换期间取消任务，保留已经完成的结果，下一次继续验证。

\`\`\`ts
const fixture${index + 1} = {
  directory: "scenario-${index + 1}",
  source: "original-${index + 1}.jpg",
  widths: [320, 640, 1280, 1920],
  formats: ["webp", "avif"],
  quality: 82,
};

const variants${index + 1} = fixture${index + 1}.widths.flatMap((width) =>
  fixture${index + 1}.formats.map((format) => ({ width, format })),
);
\`\`\`

| 检查项 | 操作 | 预期结果 |
| --- | --- | --- |
| 冷缓存 | 首次生成本组图片 | 所有尺寸均有完整产物 |
| 热缓存 | 不改输入再次构建 | 复用已有结果 |
| 局部更新 | 替换一张原图 | 只重建相关变体 |
| 中途停止 | 转换时取消任务 | 不发布未完成文件 |
| 服务恢复 | 缓存暂时不可用后重试 | 正常读取或重新生成 |

> 观察点 ${index + 1}：长回复会穿过多个屏幕。可以向上翻阅这一组的表格，再返回最新位置，确认新输出没有打断阅读。🧪

完成本组后，再对比冷缓存和热缓存的结果。如果耗时没有下降，先核对缓存位置和键值；如果出现旧图，优先检查源文件哈希以及格式、质量和尺寸是否都参与了键的计算。每次只调整一个条件，保留前后两次的对照结果。`
  ),
  "## 全部回归完成 ✅\n\n将各组结果放在一起，再决定是否需要继续调整并发量、编译流程或部署资源。先确认每个变化都能独立复现，避免同时修改多个环节后难以确认收益。",
].join("\n\n")

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve()
    const done = () => { clearTimeout(timer); signal.removeEventListener("abort", done); resolve() }
    const timer = setTimeout(done, ms)
    signal.addEventListener("abort", done, { once: true })
  })

const MODEL_PROFILES: Record<
  string,
  { opener?: string; pace: number; resolved: string }
> = {
  "pine-1": { pace: 1, resolved: "pine-1-2026-10" },
  "sonnet-5": {
    opener: "直接给结论：",
    pace: 0.6,
    resolved: "sonnet-5-2026-10",
  },
  "opus-4.8": {
    opener: "这个问题值得拆开仔细看，先把证据链补齐。",
    pace: 1.6,
    resolved: "opus-4.8-2026-09",
  },
  "gpt-5.6": {
    opener: "我从缓存键的构成入手分析。",
    pace: 0.8,
    resolved: "gpt-5.6-2026-10",
  },
}

function chunkText(text: string, size = 3): string[] {
  const characters = Array.from(text)
  const chunks: string[] = []
  for (let i = 0; i < characters.length; i += size) {
    chunks.push(characters.slice(i, i + size).join(""))
  }
  return chunks
}

export function createMockGateway(
  options: MockGatewayOptions = {}
): ChatGateway {
  const baseDelay = options.delayMs ?? 45
  let active: AbortController | undefined

  async function* script(
    request: ChatRequest,
    signal: AbortSignal
  ): AsyncGenerator<ChatEvent> {
    const text = request.messages.at(-1)?.text ?? ""
    const burst = text.includes("[burst]")
    const model = request.model ?? "pine-1"
    const profile =
      MODEL_PROFILES[Object.hasOwn(MODEL_PROFILES, model) ? model : "pine-1"]
    const delay = baseDelay * (text.includes("[slow]") ? 8 : 1) * profile.pace
    const tick = () => sleep(delay, signal)
    const alive = () => !signal.aborted
    if (!alive()) return

    const metadata = {
      providerName: "mock-provider",
      protocolName: "mock.streaming",
      requestedModel: model,
      resolvedModel: profile.resolved,
      requestId: "req_mock_001",
      responseId: "resp_mock_001",
    }

    if (text.includes("[fail-send]")) {
      yield { type: "started", metadata }
      await tick()
      if (!alive()) return
      yield {
        type: "failed",
        error: {
          kind: "transport",
          message: "连接模型服务失败，请检查网络后重试。",
        },
      }
      return
    }

    yield { type: "started", metadata }
    await tick()
    if (!alive()) return
    const parts: OutputContent[] = []

    async function* emitReasoning(
      partId: number,
      reasoning: string
    ): AsyncGenerator<ChatEvent> {
      yield { type: "part-started", partId, kind: "reasoning" }
      // 使用 baseDelay 避免 [slow] 拉长思考阶段，测试仍可用 delayMs 加速。
      await sleep(baseDelay * 10, signal)
      for (const chunk of chunkText(reasoning, 4)) {
        await sleep(baseDelay * 6, signal)
        if (!alive()) return
        yield { type: "delta", partId, text: chunk }
      }
      if (!alive()) return
      const content: OutputContent = { type: "reasoning", text: reasoning }
      parts.push(content)
      yield {
        type: "part-completed",
        partId,
        content,
      }
    }

    async function* emitTool(
      partId: number,
      name: string,
      input: unknown,
      result: { output?: unknown; errorText?: string }
    ): AsyncGenerator<ChatEvent> {
      yield { type: "part-started", partId, kind: "tool-call", name }
      const inputText = JSON.stringify(input)
      for (const chunk of chunkText(inputText, 12)) {
        await tick()
        if (!alive()) return
        yield { type: "delta", partId, text: chunk }
      }
      await sleep(baseDelay * 24, signal)
      if (!alive()) return
      const content: OutputContent = {
        type: "tool-call",
        call: { callId: `call_${partId}`, name, inputText, ...result },
      }
      parts.push(content)
      yield {
        type: "part-completed",
        partId,
        content,
      }
    }

    async function* emitText(
      partId: number,
      text: string,
      burstMode = false
    ): AsyncGenerator<ChatEvent> {
      yield { type: "part-started", partId, kind: "text" }
      for (const [index, chunk] of chunkText(
        text,
        burstMode ? 96 : 3
      ).entries()) {
        await sleep(delay * (burstMode && index % 3 === 0 ? 24 : 1), signal)
        if (!alive()) return
        yield { type: "delta", partId, text: chunk }
      }
      if (!alive()) return
      const content: OutputContent = { type: "text", text }
      parts.push(content)
      yield {
        type: "part-completed",
        partId,
        content,
      }
    }

    const searchCodeResult = text.includes("[fail-step]")
      ? { errorText: "索引服务 503：search backend unavailable" }
      : { output: { files: ["next.config.ts", "scripts/optimize-images.ts"] } }

    // burst 压测内容固定，不添加模型开场白。
    const seg1 = profile.opener
      ? `${profile.opener}\n\n${REPLY_SEG_1}`
      : REPLY_SEG_1

    if (burst) {
      yield* emitReasoning(0, BUILD_REASONING)
      if (!alive()) return
      yield* emitTool(
        1,
        "readBuildLog",
        { deployment: "dpl_8Kx2" },
        {
          output: { log: "install    41s\ncompile    38s\nimages   3m 52s" },
        }
      )
      if (!alive()) return
      yield* emitTool(2, "searchCode", { query: "cacheKey" }, searchCodeResult)
      if (!alive()) return
      yield* emitText(3, BURST_REPLY, true)
      if (!alive()) return
    } else {
      yield* emitReasoning(0, BUILD_REASONING)
      if (!alive()) return
      yield* emitTool(
        1,
        "readBuildLog",
        { deployment: "dpl_8Kx2" },
        {
          output: { log: "install    41s\ncompile    38s\nimages   3m 52s" },
        }
      )
      if (!alive()) return
      yield* emitText(2, seg1)
      if (!alive()) return

      yield* emitReasoning(
        3,
        "**检查图片缓存**\n图片阶段耗时最高，达到 3 分 52 秒。\n\n接下来检查：\n- `cacheKey` 的组成\n- 部署标识是否参与缓存键\n- 图片内容和转换参数是否被正确区分"
      )
      if (!alive()) return
      yield* emitTool(4, "searchCode", { query: "cacheKey" }, searchCodeResult)
      if (!alive()) return
      yield* emitText(5, REPLY_SEG_2)
      if (!alive()) return

      yield* emitReasoning(
        6,
        "**交叉验证方案**\n当前定位与日志一致，再对照图片缓存键的常见设计。\n\n**明确验证步骤**\n方案应同时覆盖首次构建、重复构建和图片变更后的增量构建。"
      )
      if (!alive()) return
      yield* emitTool(
        7,
        "searchWeb",
        { query: "image build cache key content hash" },
        {
          output: {
            results: [
              "缓存键应包含内容哈希与转换参数",
              "部署标识只用于关联，不参与键的计算",
            ],
          },
        }
      )
      if (!alive()) return
      yield* emitText(8, REPLY_SEG_3)
      if (!alive()) return
    }

    const usage: ChatUsage = {
      inputTokens: 312,
      outputTokens: 486,
      totalTokens: 798,
      reasoningTokens: 96,
    }
    yield { type: "usage", usage }
    if (!alive()) return
    yield {
      type: "completed",
      response: {
        assistant: { parts },
        finish: { reason: "stop" },
        usage,
        metadata,
      },
    }
  }

  return {
    stream(request) {
      const controller = new AbortController()
      active = controller
      return script(request, controller.signal)
    },
    abort() {
      active?.abort()
    },
  }
}
