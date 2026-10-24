import type { Skill, SkillSource } from "@/skills/source"

export const DEMO_SKILLS: readonly Skill[] = [
  {
    id: "weekly-report",
    name: "周报助手",
    description: "把一周的进展、数据和待办，整理成清楚的一页周报。",
    files: [
      {
        path: "SKILL.md",
        content: `---
name: weekly-report
description: 根据工作记录与指标生成周报，明确进展、风险和下一步。
---

# 周报助手

把零散的工作记录，整理成一份可以直接分享的周报。保留事实与来源，让读者快速知道本周完成了什么、哪里需要帮助。

## 什么时候使用

- 用户提供本周的工作记录、项目进展或数据。
- 用户需要整理周报、团队同步或阶段性进展。
- 已有周报需要压缩、补齐结构或检查指标口径。

## 工作流程

1. 确认报告周期、读者和本周目标；缺少关键事实时先列出待补充项。
2. 按项目整理已完成事项，区分“完成”“进行中”和“阻塞”。
3. 按照[指标口径](reference/metrics.md)核对数据，标明统计区间。
4. 使用[周报模板](reference/template.md)输出初稿。
5. 最后检查每个下一步是否有负责人和预计时间。

## 写作原则

用结果描述进展。例如，“上线批量导入，单次支持 200 条记录”比“持续推进导入功能”更清楚。

> 不补写未经确认的成果、指标和承诺。未知数据写“待补充”，缺失值不能当作零。

## 数据处理

有结构化数据时，可查看[汇总脚本](scripts/ss.js)。脚本读取 JSON 文件，计算本周与上周的完成数变化，不访问网络。

\`\`\`sh
node scripts/ss.js ./weekly-data.json
\`\`\`

输入文件示例：

\`\`\`json
{
  "current": { "completed": 24 },
  "previous": { "completed": 20 }
}
\`\`\`

## 交付前检查

- 时间范围和指标单位明确。
- 进展有事实，风险有影响，下一步有行动。
- 对外分享前已移除不必要的个人信息。
`,
      },
      {
        path: "reference/metrics.md",
        content: `# 指标口径

返回[技能说明](../SKILL.md)，或继续查看[周报模板](template.md)。

## 统计范围

本周与上周采用相同的时区和完整周期。记录实际起止日期，避免把尚未结束的一周与完整一周直接比较。

## 完成数

只统计本周期首次达到完成标准的事项；重新打开后再次完成的同一事项不重复计数。

| 指标 | 单位 | 说明 |
| --- | --- | --- |
| 本周完成数 | 项 | 本周期达到完成标准的事项数 |
| 上周完成数 | 项 | 上一个同长度周期的完成数 |
| 环比变化 | % | （本周 − 上周）÷ 上周 × 100 |

## 零值与缺失值

上周完成数为零时，环比变化没有可比较的基数，显示“—”，同时保留两期原始值。数据缺失时标记“待补充”，不要按零计算。

## 数据来源

每组数据附上来源和提取时间。使用[汇总脚本](../scripts/ss.js)前，先确认输入已经按照相同口径去重。
`,
      },
      {
        path: "reference/template.md",
        content: `# 周报模板

使用前阅读[技能说明](../SKILL.md)与[指标口径](metrics.md)。

## 本周概览

报告周期：填写起止日期。

用两到三句话说明本周目标、最重要的结果，以及需要关注的变化。

## 关键进展

| 项目 | 本周结果 | 状态 |
| --- | --- | --- |
| 项目名称 | 描述可验证的结果 | 完成 / 进行中 / 阻塞 |

## 数据观察

写明本周值、上周值、变化和来源。数据无法比较时解释原因。

## 风险与协作

说明风险的影响、当前应对和需要谁提供什么帮助。

## 下周计划

- 行动：填写具体事项。
- 负责人：填写负责人。
- 预计完成：填写日期。
`,
      },
      {
        path: "scripts/ss.js",
        content: `// 用法：node scripts/ss.js ./weekly-data.json
// 指标口径见 ../reference/metrics.md。
import { readFileSync } from "node:fs";

function summarize(data) {
  const current = data.current?.completed;
  const previous = data.previous?.completed;
  if (![current, previous].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error("两期 completed 都必须是非负安全整数。");
  }
  return {
    current,
    previous,
    changePercent: previous === 0
      ? null
      : Math.round(((current - previous) / previous) * 1000) / 10,
  };
}

try {
  const path = process.argv[2];
  if (!path) throw new Error("请提供 JSON 数据文件路径。");
  const result = summarize(JSON.parse(readFileSync(path, "utf8")));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "无法处理数据文件。");
  process.exitCode = 1;
}
`,
      },
    ],
  },
  {
    id: "research-notes",
    name: "资料整理",
    description: "为收集的资料建立摘要、来源与主题索引，方便继续研究。",
    files: [
      {
        path: "SKILL.md",
        content: `---
name: research-notes
description: 将提供的资料整理为有来源、可检索的研究笔记。
---

# 资料整理

让收集来的文章、访谈与工作笔记，变成下一次真正找得到的资料。

## 适用场景

用户提供一组资料，希望提取要点、比较观点或建立主题索引时使用。

## 整理步骤

1. 确认研究问题，给每份资料保留标题、作者、日期和来源。
2. 提取与问题有关的事实、观点和证据，避免混为一谈。
3. 标出相互支持、存在分歧和仍然缺失的信息。
4. 按[笔记结构](reference/notes.md)输出，并链接回原始资料。

## 引用规则

直接引用保持原意并注明来源。没有读到的原文不能根据标题补写；来源不可访问时，明确记录限制。

## 最终输出

先给出简短摘要，再列主题索引、各资料笔记和待查问题。每项结论都应能沿着引用回到证据。
`,
      },
      {
        path: "reference/notes.md",
        content: `# 笔记结构

返回[资料整理](../SKILL.md)。

## 来源信息

保留标题、作者或机构、发布时间、链接与阅读日期。原文未提供的信息写“未提供”。

## 核心摘要

用三到五句话说明这份资料回答了什么问题，以及它与当前研究有什么关系。

## 证据与观点

| 内容 | 类型 | 来源位置 |
| --- | --- | --- |
| 提取的要点 | 事实 / 观点 / 推断 | 章节、页码或时间戳 |

## 相关主题

采用少量、稳定的主题词。相同概念沿用已有名称，避免每份资料创建一套近义标签。

## 待查问题

记录证据不足、来源冲突和需要继续核对的问题，作为下一轮阅读的入口。
`,
      },
    ],
  },
]

export function createDemoSkillSource(): SkillSource {
  return { list: () => Promise.resolve(structuredClone(DEMO_SKILLS)) }
}
