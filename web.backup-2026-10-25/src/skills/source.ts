export type SkillFile = { path: string; content: string }

export type Skill = {
  id: string
  name: string
  description: string
  origin?: "local" | "official"
  version?: string
  files: readonly SkillFile[]
}

/** 已安装技能的原始文件；本地编辑草稿由独立缓存保存。 */
export interface SkillSource {
  list(): Promise<readonly Skill[]>
}
