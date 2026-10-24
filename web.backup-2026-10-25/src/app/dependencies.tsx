import { createContext, useContext, type ReactNode } from "react"
import type { AgentSource } from "@/agents/source"
import type { ChatGateway } from "@/chat/gateway"
import type { ThreadId } from "@/chat/dto"
import type { DesktopRuntime } from "@/desktop/runtime"
import {
  createThreadStoreRegistry,
  type ThreadStoreRegistry,
} from "@/chat/registry"
import type { ModelSource } from "@/models/source"
import type { ProviderSource } from "@/providers/source"
import type { HostCapabilities } from "@/platform/host"
import type { ThemePreferences } from "@/preferences/theme"
import type { SkillDraftCache } from "@/skills/drafts"
import type { SkillSource } from "@/skills/source"
import type { SkillLibrary } from "@/skills/library"
import type { RunSource } from "@/runs/source"
import type { WorkbenchBackend } from "@/workbench/backend"
import type { WorkspaceAccess } from "@/workspace/access"
import { createWorkspaceStore, type WorkspaceStore } from "@/workspace/store"

export interface FrontendAdapters {
  readonly backendId: string
  readonly gatewayFor: (threadId: ThreadId) => ChatGateway
  readonly desktop: DesktopRuntime
  readonly workbench: WorkbenchBackend
  readonly agents: AgentSource
  readonly runs?: RunSource
  readonly skills: SkillSource
  readonly skillLibrary?: SkillLibrary
  readonly models: ModelSource
  readonly providers?: ProviderSource
  readonly workspaceAccess: WorkspaceAccess
  readonly skillDrafts: SkillDraftCache
  readonly preferences: ThemePreferences
  readonly host: HostCapabilities
}

export interface AppDependencies extends FrontendAdapters {
  readonly threads: ThreadStoreRegistry
  readonly workspaces: WorkspaceStore
}

/** Pure construction: no requests or host subscriptions during React render. */
export function createAppDependencies(
  adapters: FrontendAdapters
): AppDependencies {
  if (!adapters.backendId.trim()) throw new Error("backendId must not be empty")
  const threads = createThreadStoreRegistry(adapters.gatewayFor)
  return { ...adapters, threads, workspaces: createWorkspaceStore(threads) }
}

const DependenciesContext = createContext<AppDependencies | undefined>(
  undefined
)

/** Keep value stable for the lifetime of one mounted application. */
export function AppDependenciesProvider({
  value,
  children,
}: {
  value: AppDependencies
  children: ReactNode
}) {
  return (
    <DependenciesContext.Provider value={value}>
      {children}
    </DependenciesContext.Provider>
  )
}

export function useAppDependencies(): AppDependencies {
  const dependencies = useContext(DependenciesContext)
  if (!dependencies) throw new Error("AppDependenciesProvider is required")
  return dependencies
}
