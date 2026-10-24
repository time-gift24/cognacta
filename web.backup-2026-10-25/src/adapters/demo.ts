import type { FrontendAdapters } from "@/app/dependencies"
import { createBrowserHost } from "./browser-host"
import { createBrowserStorage } from "./browser-storage"
import { createBrowserSkillLibrary } from "./browser-skill-library"
import { createDemoDesktopRuntime } from "./demo/desktop"
import { createDemoAgentSource } from "./demo/resources"
import { createDemoProviders } from "./demo/providers"
import { createDemoSkillSource } from "./demo/skills"
import { createMockWorkbenchBackend } from "./demo/workbench"
import { createDemoWorkspaceAccess } from "./demo/workspace"

/** Development entry and tests select implementations here, never in shared UI. */
export function createDemoAdapters(
  overrides: Partial<FrontendAdapters> = {}
): FrontendAdapters {
  const backendId = overrides.backendId ?? "demo"
  const runtime = createDemoDesktopRuntime()
  const storage =
    !overrides.skillDrafts || !overrides.preferences
      ? createBrowserStorage(backendId)
      : undefined
  const skills = overrides.skills ?? createDemoSkillSource()
  const skillDrafts = overrides.skillDrafts ?? storage!.skillDrafts
  const providerSources = createDemoProviders()
  return {
    backendId,
    ...(overrides.runs ? { runs: overrides.runs } : {}),
    gatewayFor:
      overrides.gatewayFor ??
      (overrides.models
        ? runtime.gatewayFor
        : (threadId) =>
            providerSources.wrapGateway(runtime.gatewayFor(threadId))),
    desktop: overrides.desktop ?? runtime.desktop,
    workbench: overrides.workbench ?? createMockWorkbenchBackend(),
    agents: overrides.agents ?? createDemoAgentSource(),
    skills,
    skillLibrary:
      overrides.skillLibrary ??
      createBrowserSkillLibrary(backendId, skills, skillDrafts),
    models: overrides.models ?? providerSources.models,
    providers: overrides.providers ?? providerSources.providers,
    workspaceAccess: overrides.workspaceAccess ?? createDemoWorkspaceAccess(),
    skillDrafts,
    preferences: overrides.preferences ?? storage!.themePreferences,
    host: overrides.host ?? createBrowserHost(),
  }
}
