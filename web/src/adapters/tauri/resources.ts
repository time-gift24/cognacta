import type { Skill } from "@/skills/source"
import type {
  AgentConfiguration,
  AgentEntry,
  AgentResource,
  AgentResources,
} from "@/agents/source"
import { array, boolean, number, object, string } from "./protocol"

export function readAgentConfiguration(value: unknown): AgentConfiguration {
  const raw = object(value)
  return {
    name: string(raw.name),
    description: string(raw.description),
    instructions: string(raw.instructions),
    ...(raw.requireApproval === undefined
      ? {}
      : { requireApproval: boolean(raw.requireApproval) }),
    mcpServerIds: array(raw.mcpServerIds, string),
    toolIds: array(raw.toolIds, string),
    skillIds: array(raw.skillIds, string),
  }
}
const resource = (value: unknown): AgentResource => {
  const raw = object(value)
  return {
    id: string(raw.id),
    name: string(raw.name),
    description: string(raw.description),
    ...(raw.source === "local" || raw.source === "official"
      ? { source: raw.source }
      : {}),
    ...(raw.contentId === undefined
      ? {}
      : { contentId: string(raw.contentId) }),
    ...(raw.releaseTag === undefined
      ? {}
      : { releaseTag: string(raw.releaseTag) }),
  }
}
const capability = (value: unknown) => {
  const raw = object(value)
  return {
    name: string(raw.name),
    description: string(raw.description),
    ...(raw.params === undefined ? {} : { params: string(raw.params) }),
  }
}
export function readMcpCapabilities(value: unknown) {
  const raw = object(value)
  return {
    tools: array(raw.tools ?? [], capability),
    resources: array(raw.resources ?? [], capability),
    prompts: array(raw.prompts ?? [], capability),
  }
}
export function readAgent(value: unknown): AgentEntry {
  const raw = object(value)
  return {
    id: string(raw.id),
    ...(raw.source === "local" || raw.source === "official"
      ? { source: raw.source }
      : {}),
    ...(raw.contentId === undefined
      ? {}
      : { contentId: string(raw.contentId) }),
    ...(raw.releaseTag === undefined
      ? {}
      : { releaseTag: string(raw.releaseTag) }),
    configuration: readAgentConfiguration(raw.configuration),
  }
}
export function readAgents(value: unknown) {
  const raw = object(value),
    resources = object(raw.resources)
  const parsedResources: AgentResources = {
    tools: array(resources.tools, resource),
    skills: array(resources.skills, resource),
    mcpServers: array(resources.mcpServers, (value) => {
      const raw = object(value)
      return {
        ...resource(raw),
        ...(raw.url === undefined ? {} : { url: string(raw.url) }),
        ...(raw.credentialEnv === undefined
          ? {}
          : { credentialEnv: string(raw.credentialEnv) }),
        capabilities: readMcpCapabilities(raw.capabilities ?? {}),
      }
    }),
  }
  return {
    agents: array(raw.agents, readAgent),
    resources: parsedResources,
  }
}
export function readDirectory(value: unknown) {
  const raw = object(value)
  return { path: string(raw.path), name: string(raw.name) }
}
export function readFiles(value: unknown) {
  return array(value, (entry) => {
    const raw = object(entry)
    return {
      path: string(raw.path),
      name: string(raw.name),
      size: string(raw.size),
    }
  })
}
export function readFile(value: unknown) {
  const raw = object(value)
  return { path: string(raw.path), lines: array(raw.lines, string) }
}
export function readChanges(value: unknown) {
  const raw = object(value)
  return {
    fileCount: number(raw.fileCount),
    added: number(raw.added),
    removed: number(raw.removed),
    files: array(raw.files, (value) => {
      const file = object(value)
      return {
        path: string(file.path),
        added: number(file.added),
        removed: number(file.removed),
      }
    }),
  }
}
export function readSkills(value: unknown): Skill[] {
  return array(value, (entry): Skill => {
    const raw = object(entry)
    return {
      id: string(raw.id),
      name: string(raw.name),
      description: string(raw.description),
      ...(raw.origin === "official" || raw.origin === "local"
        ? { origin: raw.origin }
        : {}),
      ...(raw.version === undefined ? {} : { version: string(raw.version) }),
      files: array(raw.files, (entry) => {
        const file = object(entry)
        return { path: string(file.path), content: string(file.content) }
      }),
    }
  })
}
