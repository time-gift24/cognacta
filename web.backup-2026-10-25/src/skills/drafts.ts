import type { Skill } from "./source.ts"

export interface SkillDraftCache {
  load(skills: readonly Skill[]): Promise<Record<string, string>>
  save(skillId: string, path: string, content: string): Promise<void>
  remove(skillId: string, path: string): Promise<void>
}

export function fileKey(skillId: string, path: string): string {
  return JSON.stringify([skillId, path])
}
