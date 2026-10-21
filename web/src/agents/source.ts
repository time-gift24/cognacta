export type AgentConfiguration = {
  name: string
  description: string
  instructions: string
  mcpServerIds: string[]
  toolIds: string[]
  skillIds: string[]
  /** Legacy demo preference; local runtime executes the saved assembly directly. */
  requireApproval?: boolean
}

export type AgentEntry = {
  id: string
  source?: "local" | "official"
  contentId?: string
  releaseTag?: string
  configuration: AgentConfiguration
  draft?: AgentConfiguration
}

export type AgentResource = {
  id: string
  name: string
  description: string
  source?: "local" | "official"
  contentId?: string
  releaseTag?: string
}

/** MCP 服务提供的一项能力：工具、资源或提示词。 */
export type McpCapability = {
  name: string
  description: string
  /** 参数摘要，供展示技术详情使用。 */
  params?: string
}

export type McpCapabilities = {
  tools: readonly McpCapability[]
  resources: readonly McpCapability[]
  prompts: readonly McpCapability[]
}

export type McpConfiguration = {
  id: string
  name: string
  description: string
  url: string
  credentialEnv?: string
}
export type McpServer = AgentResource & {
  capabilities: McpCapabilities
  url?: string
  credentialEnv?: string
}

export type AgentResources = {
  mcpServers: readonly McpServer[]
  tools: readonly AgentResource[]
  skills: readonly AgentResource[]
}

export interface AgentSource {
  load(): Promise<{ agents: readonly AgentEntry[]; resources: AgentResources }>
  save(id: string, configuration: AgentConfiguration): Promise<void>
  create?(input?: {
    configuration?: AgentConfiguration
    copyFrom?: string
  }): Promise<AgentEntry>
  saveMcp?(server: McpConfiguration): Promise<void>
  removeMcp?(id: string): Promise<void>
  testMcp?(id: string): Promise<McpCapabilities>
}
