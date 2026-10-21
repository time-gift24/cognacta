import type {
  AgentConfiguration,
  AgentEntry,
  AgentResource,
  AgentSource,
  McpServer,
} from "@/agents/source"
import type { ModelChoice, ModelSource } from "@/models/source"

export const DEFAULT_AGENT: AgentConfiguration = {
  name: "客户支持",
  description: "回答清楚，跟进得体。",
  instructions:
    "你是客户支持助手。回答时优先使用已连接的工具核实信息，保持清晰简洁。无法确认答案时如实说明，并建议转人工支持。涉及变更客户数据的操作，先征得用户确认。",
  mcpServerIds: ["feishu"],
  toolIds: ["search"],
  skillIds: ["meeting-notes"],
  requireApproval: true,
}

export const MCP_SERVERS: readonly McpServer[] = [
  {
    id: "feishu",
    name: "飞书",
    description: "消息、文档与日程协作",
    capabilities: {
      tools: [
        {
          name: "发送消息",
          description: "向指定会话发送文本消息",
          params: "chatId: string, text: string",
        },
        {
          name: "搜索文档",
          description: "按关键词检索云文档标题与正文",
          params: "query: string, limit?: number",
        },
        {
          name: "读取日程",
          description: "查询指定时间范围内的日程安排",
          params: "dateRange: [string, string]",
        },
      ],
      resources: [
        {
          name: "云文档索引",
          description: "可访问文档的结构化目录，按空间组织",
        },
      ],
      prompts: [
        {
          name: "会议纪要模板",
          description: "把讨论记录整理为决议与待办的固定格式",
        },
      ],
    },
  },
  {
    id: "browser",
    name: "浏览器",
    description: "在用户的 Chrome 中读取和操作页面",
    capabilities: {
      tools: [
        {
          name: "打开页面",
          description: "导航到指定 URL 并等待加载完成",
          params: "url: string",
        },
        {
          name: "提取正文",
          description: "读取当前页面的可读文本内容",
        },
        {
          name: "截图",
          description: "截取当前视口或整页图像",
          params: "fullPage?: boolean",
        },
      ],
      resources: [],
      prompts: [],
    },
  },
  {
    id: "database",
    name: "数据查询",
    description: "只读访问业务数据库",
    capabilities: {
      tools: [
        {
          name: "执行只读查询",
          description: "运行 SELECT 语句并返回结构化结果",
          params: "sql: string, rowLimit?: number",
        },
      ],
      resources: [
        {
          name: "数据表清单",
          description: "可查询表的名称、字段与行数估计",
        },
        {
          name: "指标字典",
          description: "业务指标的定义与计算口径",
        },
      ],
      prompts: [],
    },
  },
]

export const AGENT_TOOLS: readonly AgentResource[] = [
  {
    id: "search",
    name: "联网搜索",
    description: "检索公开网页并引用来源",
  },
  {
    id: "lookup",
    name: "订单查询",
    description: "从已连接的系统读取订单详情",
  },
  {
    id: "ticket",
    name: "创建工单",
    description: "把问题升级给人工处理",
  },
]

export const AGENT_SKILLS: readonly AgentResource[] = [
  {
    id: "meeting-notes",
    name: "会议纪要",
    description: "把讨论整理成决议、待办和负责人",
  },
  {
    id: "weekly-report",
    name: "周报生成",
    description: "汇总本周进展、风险与下周计划",
  },
  {
    id: "release-notes",
    name: "发布说明",
    description: "从变更记录提炼面向用户的更新文案",
  },
]

const INITIAL_AGENTS: readonly AgentEntry[] = [
  { id: "customer-support", configuration: DEFAULT_AGENT },
  {
    id: "weekly-data-report",
    configuration: {
      name: "数据周报",
      description: "汇总业务数据，生成每周报告。",
      instructions:
        "你是数据分析助手。每周一汇总上周的核心业务指标，通过只读查询核实数据，引用指标字典中的口径。产出结构化的周报：亮点、异常、下周关注点。",
      mcpServerIds: ["database", "feishu"],
      toolIds: ["search"],
      skillIds: ["weekly-report"],
      requireApproval: false,
    },
  },
]

export const DEMO_MODELS: readonly ModelChoice[] = [
  { id: "pine-1", label: "Pine 1", isDefault: true },
  { id: "sonnet-5", label: "Sonnet 5" },
  { id: "opus-4.8", label: "Opus 4.8" },
  { id: "gpt-5.6", label: "GPT 5.6" },
]

/** 每个应用实例持有独立的演示数据，调用方不能通过修改返回值写入来源。 */
export function createDemoAgentSource(): AgentSource {
  let agents = structuredClone(INITIAL_AGENTS)
  const validate = (configuration: AgentConfiguration) => {
    if (!configuration.name.trim() || !configuration.instructions.trim())
      throw new Error("请先填写名称和系统提示词，再保存。")
  }
  return {
    load() {
      return Promise.resolve(
        structuredClone({
          agents,
          resources: {
            mcpServers: MCP_SERVERS,
            tools: AGENT_TOOLS,
            skills: AGENT_SKILLS,
          },
        })
      )
    },
    async save(id, configuration) {
      if (!agents.some((agent) => agent.id === id))
        throw new Error("找不到这个 Agent。")
      validate(configuration)
      agents = agents.map((agent) =>
        agent.id === id
          ? { id, configuration: structuredClone(configuration) }
          : agent
      )
    },
    async create(input = {}) {
      const original = input.copyFrom
        ? agents.find((agent) => agent.id === input.copyFrom)
        : undefined
      if (input.copyFrom && !original) throw new Error("找不到这个 Agent。")
      const configured = input.configuration
      const configuration = structuredClone(
        configured ??
          original?.configuration ?? {
            name: "",
            description: "",
            instructions: "",
            requireApproval: true,
            mcpServerIds: [],
            toolIds: [],
            skillIds: [],
          }
      )
      if (configured) validate(configuration)
      if (original && !configured)
        configuration.name = `${configuration.name}（副本）`
      const agent: AgentEntry = {
        id: crypto.randomUUID(),
        source: "local",
        configuration,
      }
      agents = [...agents, agent]
      return structuredClone(agent)
    },
  }
}

export function createDemoModelSource(): ModelSource {
  return { list: () => Promise.resolve(structuredClone(DEMO_MODELS)) }
}
