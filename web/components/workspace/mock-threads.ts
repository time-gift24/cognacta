import type { ChatSource, ChatTool } from "@/components/arc/blocks/ai-chat/chat-data";
import type { Message, Session } from "./types";

type Locale = "zh" | "en";
type MockMessage = Omit<Message, "id">;
type MockSession = {
  id: string;
  title: string;
  messages: MockMessage[];
};

const source = (
  title: string,
  url: string,
  snippet: string,
): ChatSource => ({ title, url, snippet });

const tool = (
  id: string,
  name: string,
  summary: string,
  icon: ChatTool["icon"],
  input: string[],
  output: string,
): ChatTool => ({
  id,
  name,
  activeName: name,
  status: "done",
  summary,
  icon,
  input,
  output,
});

const zh: MockSession[] = [
  {
    id: "demo-refund-incident",
    title: "排查退款运行失败",
    messages: [
      {
        role: "user",
        content:
          "昨晚 23:40 的退款流程运行失败了。先帮我定位原因，不要改配置。",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 4,
        reasoning:
          "先看失败步骤和工具调用，再把超时与业务失败分开。没有拿到支付确认之前，不能直接重试。",
        tools: [
          tool(
            "run-log",
            "查询运行记录",
            "1 次失败 · 2 次重试",
            "database",
            [
              "SELECT run_id, step, error FROM run_events WHERE workflow = 'refund' AND started_at >= '2026-10-24' ORDER BY started_at DESC LIMIT 20;",
            ],
            "run_8f2c · step 3/5 · TOOL_TIMEOUT · 30.0s",
          ),
        ],
        sources: [
          source(
            "运行手册：退款流程",
            "https://docs.cognacta.dev/runbooks/refund",
            "第 3 步调用支付工具，必须在拿到确认后再写入退款结果。",
          ),
          source(
            "工具超时与重试策略",
            "https://docs.cognacta.dev/runtime/tool-timeouts",
            "工具超时默认 30 秒；重试必须复用同一个幂等键。",
          ),
        ],
        content:
          "失败发生在第 3 步 `charge.refund`，不是退款接口本身。\n\n- **时间**：23:40:12 开始，30 秒后工具超时\n- **重试**：2 次，都卡在同一个工具调用\n- **结果**：退款单未写入，运行状态停在 `waiting_for_tool`\n\n请求已经到支付服务，但客户端没有在超时前拿到确认。先做沙箱回放，不要直接重试生产运行。[1][2]",
      },
      {
        role: "user",
        content: "给我一个最小复现，不要触发真实退款。",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 3,
        reasoning:
          "用同一版流程和同一组输入做沙箱回放，并把支付工具替换成可控的桩。",
        tools: [
          tool(
            "replay",
            "创建沙箱回放",
            "sandbox · run_9a1d",
            "code",
            ["cognacta replay run_8f2c --sandbox --stub payment"],
            "sandbox ready · 12s · no external charge",
          ),
        ],
        content:
          "用沙箱回放，把输入和工具版本都固定住，就不会触发真实退款。\n\n1. 复制失败运行的输入快照\n2. 把 `payment` 工具替换为延迟 30 秒的桩\n3. 只回放第 3 步，观察超时后的状态\n\n```bash\ncognacta replay run_8f2c \\\n  --sandbox \\\n  --stub payment=timeout:30s\n```\n\n如果第 3 步仍然超时，问题在工具边界；如果通过，问题在真实支付服务的响应时间。",
      },
      {
        role: "user",
        content: "如果重试，会不会重复退款？",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 2,
        reasoning:
          "检查幂等键在两次尝试之间是否复用，以及写入结果是否发生在确认之前。",
        sources: [
          source(
            "幂等键设计",
            "https://docs.cognacta.dev/patterns/idempotency",
            "同一个业务动作的所有重试必须共享幂等键，服务端才能安全去重。",
          ),
        ],
        content:
          "会，当前实现有风险。每次重试都会生成新的 `idempotency_key`，支付服务会把第二次调用当成一笔新退款。\n\n需要改的是：\n\n- 把幂等键放到运行级别，而不是工具调用级别\n- 重试时复用同一个键\n- 只有拿到 `succeeded` 后才写入退款结果\n\n```ts\nconst key = `refund:${run.id}`;\nawait payment.refund({ orderId, amount, idempotencyKey: key });\n```\n\n改完先用沙箱连续重试三次，确认只产生一条退款记录。[1]",
      },
    ],
  },
  {
    id: "demo-pricing-model",
    title: "定价模型压力测试",
    messages: [
      {
        role: "user",
        content:
          "按 42 人、每月 18 万次运行，对比按席位、按运行次数、按结果三种定价。",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 5,
        reasoning:
          "先统一计费口径，再用当前用量算三种模型；失败运行和成功运行要分开看。",
        tools: [
          tool(
            "usage",
            "查询本月用量",
            "42 seats · 184,200 runs",
            "database",
            [
              "SELECT seats, runs, successful_runs FROM billing_usage WHERE period = '2026-10';",
            ],
            "42 seats · 184,200 runs · 167,622 successful",
          ),
        ],
        sources: [
          source(
            "计费口径说明",
            "https://docs.cognacta.dev/billing/metering",
            "运行次数在开始执行时计量；按结果计费只统计成功完成的运行。",
          ),
        ],
        content:
          "按当前用量，三种模型的大致月成本如下（不含折扣）：\n\n- **按席位**：42 × ¥99 = **¥4,158**，用量翻倍也不变\n- **按运行**：18.4 万 × ¥0.025 = **¥4,605**，失败运行也计费\n- **按结果**：16.8 万成功 × ¥0.03 = **¥5,029**，失败不计费\n\n现在最便宜的是按席位，但它把成本从重度使用团队摊回全员。按结果最贵，不过它和实际交付价值对齐。[1]",
      },
      {
        role: "user",
        content: "如果明年运行次数翻倍，哪种更稳？",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 3,
        reasoning:
          "把运行量翻倍作为统一变量，成功率保持不变，再看成本弹性和预算可预测性。",
        tools: [
          tool(
            "scenario",
            "运行翻倍测算",
            "36.8 万次 · 成功率 91%",
            "code",
            ["billing simulate --runs 368000 --success-rate 0.91 --seats 42"],
            "seat ¥4,158 · run ¥9,210 · outcome ¥10,057",
          ),
        ],
        content:
          "翻倍到 36.8 万次、成功率不变时：\n\n- **按席位**：¥4,158，成本完全不变\n- **按运行**：¥9,210，随用量线性增长\n- **按结果**：¥10,057，随成功交付增长\n\n如果运行量会持续增长，**按席位最可预测**，但会鼓励全员多用。**按结果最适合对外报价**，失败不收费；**按运行适合内部成本分摊**。我的建议是内部用席位、对外用结果，不要混在同一张合同里。",
      },
    ],
  },
  {
    id: "demo-research-interviews",
    title: "访谈主题与行业优先级",
    messages: [
      {
        role: "user",
        content: "把最近 12 份客户访谈整理成三个主题，附原话。",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 6,
        reasoning:
          "先按客户最先提到的阻力归类，再统计每个主题出现的访谈数，避免把个别强观点当成普遍问题。",
        tools: [
          tool(
            "interviews",
            "检索访谈库",
            "12 份访谈 · 38 条摘录",
            "search",
            ["tags:research AND period:2026-Q3"],
            "12 interviews · 38 excerpts",
          ),
        ],
        sources: [
          source(
            "访谈 03 · 制造业 · 运营负责人",
            "https://docs.cognacta.dev/research/interview-03",
            "“我们不是不想用，是每次都要先找 IT 开权限，流程就断了。”",
          ),
          source(
            "访谈 07 · 零售 · 业务构建者",
            "https://docs.cognacta.dev/research/interview-07",
            "“我最怕的是它跑错了，但没人知道它为什么错。”",
          ),
        ],
        content:
          "三个主题，按出现频次排序：\n\n1. **权限与审计是采购门槛**（9 / 12）\n   客户要先证明“谁能看、谁能改、出错谁负责”，才愿意把真实流程接进来。[1]\n\n2. **失败不可解释**（8 / 12）\n   运行失败时只看到“工具错误”，不知道是哪一步、输入是什么、重试会不会更糟。[2]\n\n3. **业务人员依赖 IT 才能开始**（6 / 12）\n   创建第一个 agent 之前就要走权限申请，很多试用停在这一步。",
      },
      {
        role: "user",
        content: "只看制造业客户，重新排一下优先级。",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 3,
        reasoning:
          "制造业样本只有 4 份，频次不适合直接和全量比较；改看阻力的严重程度和是否阻断上线。",
        tools: [
          tool(
            "filter",
            "筛选制造业访谈",
            "4 份访谈 · 11 条摘录",
            "database",
            ["sector:manufacturing AND period:2026-Q3"],
            "4 interviews · 11 excerpts",
          ),
        ],
        content:
          "制造业样本只有 4 份，优先级应该看“是否阻断上线”，而不是只看提及次数。\n\n- **P0 权限与审计**：4 份都提到，且都发生在试点转生产之前\n- **P1 失败可解释**：3 份提到，影响值班接管，但可以先靠人工兜底\n- **P2 自助创建**：2 份提到，更多是效率问题，不是上线阻塞\n\n制造业客户的共同点是：他们愿意接受慢一点，但不能接受“不知道发生了什么”。",
      },
      {
        role: "user",
        content: "把第二个主题写成一页汇报。",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 2,
        reasoning:
          "用问题、证据、影响、建议四段，控制在半页到一页；不堆访谈编号，只保留最有代表性的原话。",
        content:
          "### 失败不可解释：客户不敢把流程交给 agent\n\n**问题**\n运行失败时，界面只给出工具错误，没有失败步骤、输入快照或可执行的重试建议。\n\n**证据**\n8 / 12 份访谈提到失败解释；制造业客户里是 3 / 4。\n\n> “我最怕的是它跑错了，但没人知道它为什么错。” —— 零售 · 业务构建者\n\n**影响**\n- 值班人员需要回到日志里手工定位，平均接管时间被拉长\n- 客户不敢开放自动重试，agent 只能停在“建议”层\n\n**建议**\n在运行详情里固定展示失败步骤、工具输入输出和幂等状态，并给出一个可执行的下一步。先把“为什么错”讲清楚，再谈自动修复。",
      },
    ],
  },
  {
    id: "demo-launch-checklist",
    title: "退款 agent 上线清单",
    messages: [
      {
        role: "user",
        content:
          "为退款 agent 上线准备一份检查清单，覆盖权限、超时、回退和观测。",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 4,
        reasoning:
          "先从现有配置读取工具和超时，再把清单按上线前必须通过和上线后观察分开。",
        tools: [
          tool(
            "config",
            "读取现有配置",
            "3 个工具 · 2 个超时",
            "file",
            ["agent.config refund-agent"],
            "tools: refund, lookup_order, notify · timeout: 30s/120s",
          ),
        ],
        sources: [
          source(
            "上线检查清单",
            "https://docs.cognacta.dev/runbooks/launch-checklist",
            "所有会改变外部状态的工具都必须有权限边界、超时和幂等键。",
          ),
        ],
        content:
          "**上线前必须通过**\n\n- [ ] 退款工具只允许服务账号调用，业务人员无直接执行权限\n- [ ] 每个外部写操作都有运行级幂等键\n- [ ] 工具超时 ≤ 30s，整条运行超时 ≤ 120s\n- [ ] 失败重试上限 3 次，超过后转人工接管\n- [ ] 回退开关能在 1 分钟内关闭自动退款\n\n**上线后观察**\n\n- [ ] 成功率、P95 耗时、工具超时率\n- [ ] 人工接管数量和原因\n- [ ] 重复退款告警\n\n先别把“自动重试”打开，等第一周的失败样本齐了再决定。[1]",
      },
      {
        role: "user",
        content: "把观测部分展开成具体指标。",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 3,
        reasoning:
          "指标要能回答三个问题：是否成功、慢在哪里、失败后是否安全。每个指标都要有阈值和处置动作。",
        tools: [
          tool(
            "metrics",
            "生成指标草案",
            "6 个指标 · 3 个告警",
            "code",
            ["cognacta metrics draft --workflow refund"],
            "draft created · 6 metrics · 3 alerts",
          ),
        ],
        content:
          "建议先用 6 个指标，不要一上来铺满面板。\n\n- **运行成功率**：≥ 99%；低于阈值先暂停自动退款\n- **P95 运行耗时**：≤ 45s；超过时检查支付工具响应\n- **工具超时率**：≤ 0.5%；连续 5 分钟超标转人工\n- **重复退款告警**：任何一次都立即告警\n- **人工接管率**：基线 2%，超过 5% 回看失败原因\n- **待确认运行数**：> 10 时暂停新运行\n\n```yaml\nalert: refund_duplicate_charge\nexpr: increase(refund_duplicate_total[5m]) > 0\nfor: 0m\nseverity: critical\naction: disable_auto_refund\n```\n\n重复退款不能只做告警，要直接触发回退开关。",
      },
    ],
  },
];

const en: MockSession[] = [
  {
    id: "demo-refund-incident",
    title: "Investigate the failed refund run",
    messages: [
      {
        role: "user",
        content:
          "The refund workflow failed at 23:40 last night. Find the cause first, don't change any config.",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 4,
        reasoning:
          "Start with the failed step and the tool call, then separate a timeout from a business failure. Do not retry before we know whether the payment was confirmed.",
        tools: [
          tool(
            "run-log",
            "Queried run history",
            "1 failure · 2 retries",
            "database",
            [
              "SELECT run_id, step, error FROM run_events WHERE workflow = 'refund' AND started_at >= '2026-10-24' ORDER BY started_at DESC LIMIT 20;",
            ],
            "run_8f2c · step 3/5 · TOOL_TIMEOUT · 30.0s",
          ),
        ],
        sources: [
          source(
            "Runbook: refund workflow",
            "https://docs.cognacta.dev/runbooks/refund",
            "Step 3 calls the payment tool and must write the refund only after the confirmation arrives.",
          ),
          source(
            "Tool timeouts and retries",
            "https://docs.cognacta.dev/runtime/tool-timeouts",
            "The default tool timeout is 30 seconds. Retries must reuse the same idempotency key.",
          ),
        ],
        content:
          "The failure is in step 3, `charge.refund`, not in the refund API itself.\n\n- **Time**: started at 23:40:12, timed out 30 seconds later\n- **Retries**: 2, both stuck on the same tool call\n- **Result**: no refund row written; the run is stuck in `waiting_for_tool`\n\nThe request reached the payment service, but the client never received the confirmation. Replay it in the sandbox before touching production.[1][2]",
      },
      {
        role: "user",
        content:
          "Give me a minimal reproduction that won't trigger a real refund.",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 3,
        reasoning:
          "Replay the same workflow version and input in the sandbox, with the payment tool replaced by a controllable stub.",
        tools: [
          tool(
            "replay",
            "Created a sandbox replay",
            "sandbox · run_9a1d",
            "code",
            ["cognacta replay run_8f2c --sandbox --stub payment"],
            "sandbox ready · 12s · no external charge",
          ),
        ],
        content:
          "Replay it in the sandbox with the input and tool versions pinned, so no real money moves.\n\n1. Copy the input snapshot from the failed run\n2. Replace the `payment` tool with a stub that waits 30 seconds\n3. Replay step 3 only and inspect the state after the timeout\n\n```bash\ncognacta replay run_8f2c \\\n  --sandbox \\\n  --stub payment=timeout:30s\n```\n\nIf step 3 still times out, the problem is at the tool boundary. If it passes, the live payment service is responding too slowly.",
      },
      {
        role: "user",
        content: "If we retry, could it refund twice?",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 2,
        reasoning:
          "Check whether the idempotency key is reused between attempts and whether the result is written before confirmation.",
        sources: [
          source(
            "Idempotency key design",
            "https://docs.cognacta.dev/patterns/idempotency",
            "Every retry of the same business action must share one idempotency key so the service can deduplicate safely.",
          ),
        ],
        content:
          "Yes, the current implementation is risky. Every retry creates a new `idempotency_key`, so the payment service treats the second call as a new refund.\n\nWhat needs to change:\n\n- Put the idempotency key at the run level, not the tool-call level\n- Reuse the same key on retry\n- Write the refund only after `succeeded`\n\n```ts\nconst key = `refund:${run.id}`;\nawait payment.refund({ orderId, amount, idempotencyKey: key });\n```\n\nAfter the change, retry three times in the sandbox and confirm only one refund row exists.[1]",
      },
    ],
  },
  {
    id: "demo-pricing-model",
    title: "Pricing model stress test",
    messages: [
      {
        role: "user",
        content:
          "Compare per-seat, per-run, and per-outcome pricing for 42 people and 180k runs a month.",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 5,
        reasoning:
          "Pin down the metering rules first, then price the current usage. Keep failed and successful runs separate.",
        tools: [
          tool(
            "usage",
            "Queried this month's usage",
            "42 seats · 184,200 runs",
            "database",
            [
              "SELECT seats, runs, successful_runs FROM billing_usage WHERE period = '2026-10';",
            ],
            "42 seats · 184,200 runs · 167,622 successful",
          ),
        ],
        sources: [
          source(
            "How metering works",
            "https://docs.cognacta.dev/billing/metering",
            "Runs are counted when execution starts; outcome pricing counts only successfully completed runs.",
          ),
        ],
        content:
          "At current usage, the rough monthly cost of each model is (before discounts):\n\n- **Per seat**: 42 × $99 = **$4,158**, unchanged if usage doubles\n- **Per run**: 184k × $0.025 = **$4,605**, failed runs included\n- **Per outcome**: 168k successful × $0.03 = **$5,029**, failures not billed\n\nPer seat is cheapest today, but it spreads the cost from heavy teams to everyone. Per outcome costs the most, but it aligns with delivered value.[1]",
      },
      {
        role: "user",
        content: "If run volume doubles next year, which is more stable?",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 3,
        reasoning:
          "Hold the success rate constant and double the run volume, then compare cost elasticity and budget predictability.",
        tools: [
          tool(
            "scenario",
            "Modeled doubled volume",
            "368k runs · 91% success",
            "code",
            ["billing simulate --runs 368000 --success-rate 0.91 --seats 42"],
            "seat $4,158 · run $9,210 · outcome $10,057",
          ),
        ],
        content:
          "At 368k runs with the same success rate:\n\n- **Per seat**: $4,158, completely flat\n- **Per run**: $9,210, linear with usage\n- **Per outcome**: $10,057, tracks successful delivery\n\nIf volume keeps growing, **per seat is the most predictable**, but it encourages everyone to use it. **Per outcome fits external pricing** because failures are free; **per run fits internal cost allocation**. My suggestion: seats for internal teams, outcomes for the external contract. Do not mix them in one agreement.",
      },
    ],
  },
  {
    id: "demo-research-interviews",
    title: "Interview themes and sector priorities",
    messages: [
      {
        role: "user",
        content:
          "Turn the last 12 customer interviews into three themes, with quotes.",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 6,
        reasoning:
          "Group by the first blocker each customer mentioned, then count how many interviews mention each theme so one loud opinion doesn't become the story.",
        tools: [
          tool(
            "interviews",
            "Searched the interview library",
            "12 interviews · 38 excerpts",
            "search",
            ["tags:research AND period:2026-Q3"],
            "12 interviews · 38 excerpts",
          ),
        ],
        sources: [
          source(
            "Interview 03 · Manufacturing · Ops lead",
            "https://docs.cognacta.dev/research/interview-03",
            '"It is not that we do not want to use it; finding IT to grant access breaks the flow every time."',
          ),
          source(
            "Interview 07 · Retail · Business builder",
            "https://docs.cognacta.dev/research/interview-07",
            '"My biggest fear is that it runs the wrong thing and nobody knows why."',
          ),
        ],
        content:
          "Three themes, ordered by frequency:\n\n1. **Permissions and audit are the procurement gate** (9 / 12)\n   Customers need to prove who can see, who can change, and who owns a failure before connecting a real workflow.[1]\n\n2. **Failures are not explainable** (8 / 12)\n   When a run fails, they see a tool error but not the step, the input, or whether a retry will make it worse.[2]\n\n3. **Business users depend on IT to start** (6 / 12)\n   Access requests happen before the first agent exists; many trials stop right there.",
      },
      {
        role: "user",
        content:
          "Look only at manufacturing customers and reprioritize.",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 3,
        reasoning:
          "There are only four manufacturing interviews, so frequency is less useful. Prioritize by severity and whether the blocker stops production rollout.",
        tools: [
          tool(
            "filter",
            "Filtered manufacturing interviews",
            "4 interviews · 11 excerpts",
            "database",
            ["sector:manufacturing AND period:2026-Q3"],
            "4 interviews · 11 excerpts",
          ),
        ],
        content:
          "There are only four manufacturing interviews, so prioritize by whether the blocker stops rollout, not by mention count.\n\n- **P0 permissions and audit**: all 4, and all came up before moving a pilot to production\n- **P1 explainable failures**: 3, affects on-call handoff but can be handled manually for now\n- **P2 self-serve creation**: 2, mostly an efficiency issue rather than an adoption blocker\n\nThe shared pattern: these customers can accept slower, but not \"we do not know what happened\".",
      },
      {
        role: "user",
        content: "Turn the second theme into a one-page briefing.",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 2,
        reasoning:
          "Use problem, evidence, impact, recommendation. Keep one representative quote instead of stacking interview IDs.",
        content:
          "### Unexplained failures keep customers from trusting the agent\n\n**Problem**\nWhen a run fails, the interface shows a tool error without the failed step, the input snapshot, or an actionable retry path.\n\n**Evidence**\n8 of 12 interviews mention explainability; among manufacturing customers it is 3 of 4.\n\n> \"My biggest fear is that it runs the wrong thing and nobody knows why.\" — Retail · Business builder\n\n**Impact**\n- On-call staff go back to raw logs, which lengthens takeover time\n- Customers won't enable automatic retry, so the agent stays at the suggestion layer\n\n**Recommendation**\nAlways show the failed step, tool input and output, and idempotency state in run details, plus one executable next step. Explain the failure before automating the fix.",
      },
    ],
  },
  {
    id: "demo-launch-checklist",
    title: "Refund agent launch checklist",
    messages: [
      {
        role: "user",
        content:
          "Build a launch checklist for the refund agent covering permissions, timeouts, rollback, and observability.",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 4,
        reasoning:
          "Read the current tools and timeouts first, then split the checklist into must-pass before launch and observe-after-launch.",
        tools: [
          tool(
            "config",
            "Read the current config",
            "3 tools · 2 timeouts",
            "file",
            ["agent.config refund-agent"],
            "tools: refund, lookup_order, notify · timeout: 30s/120s",
          ),
        ],
        sources: [
          source(
            "Launch checklist",
            "https://docs.cognacta.dev/runbooks/launch-checklist",
            "Every tool that changes external state needs a permission boundary, a timeout, and an idempotency key.",
          ),
        ],
        content:
          "**Must pass before launch**\n\n- [ ] Only the service account can call the refund tool; business users cannot execute it directly\n- [ ] Every external write has a run-level idempotency key\n- [ ] Tool timeout ≤ 30s; whole-run timeout ≤ 120s\n- [ ] Retries stop at 3 and hand off to a human\n- [ ] The rollback switch can disable automatic refunds within one minute\n\n**Observe after launch**\n\n- [ ] Success rate, P95 duration, tool timeout rate\n- [ ] Human takeover count and reason\n- [ ] Duplicate refund alert\n\nDo not turn on automatic retry yet. Wait for the first week of failure samples.[1]",
      },
      {
        role: "user",
        content: "Expand the observability section into concrete metrics.",
      },
      {
        role: "assistant",
        model: "claude-sonnet-5",
        thoughtFor: 3,
        reasoning:
          "Metrics should answer three questions: did it succeed, where is it slow, and is a failure safe. Every metric needs a threshold and an action.",
        tools: [
          tool(
            "metrics",
            "Drafted the metrics",
            "6 metrics · 3 alerts",
            "code",
            ["cognacta metrics draft --workflow refund"],
            "draft created · 6 metrics · 3 alerts",
          ),
        ],
        content:
          "Start with six metrics; do not fill a dashboard on day one.\n\n- **Run success rate**: ≥ 99%; pause automatic refunds below the threshold\n- **P95 run duration**: ≤ 45s; inspect payment latency when it slips\n- **Tool timeout rate**: ≤ 0.5%; hand off after five minutes above it\n- **Duplicate refunds**: alert on any occurrence\n- **Human takeover rate**: baseline 2%, review causes above 5%\n- **Runs waiting for confirmation**: pause new runs above 10\n\n```yaml\nalert: refund_duplicate_charge\nexpr: increase(refund_duplicate_total[5m]) > 0\nfor: 0m\nseverity: critical\naction: disable_auto_refund\n```\n\nA duplicate refund must trigger the rollback switch, not just an alert.",
      },
    ],
  },
];

const threads: Record<Locale, MockSession[]> = { zh, en };

export function createRichSessions(locale: Locale): Session[] {
  return threads[locale].map((thread) => ({
    ...thread,
    archived: false,
    messages: thread.messages.map((message, index) => ({
      ...message,
      id: index + 1,
    })),
  }));
}
