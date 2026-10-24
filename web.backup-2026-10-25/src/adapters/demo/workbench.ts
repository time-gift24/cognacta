import type { WorkbenchBackend } from "@/workbench/backend"
import {
  CHANGE_SET,
  MOCK_FILE_LINES,
  RECOMMENDED_SITES,
  WORKSPACE_FILES,
} from "./workbench-data"

/**
 * 示例实现：只返回内存中的静态数据，用于布局与样式开发。
 * 接入真实桌面端／服务端能力时，以同一接口提供新实现并替换注入点。
 */
export function createMockWorkbenchBackend(): WorkbenchBackend {
  return {
    listRecommendations() {
      return Promise.resolve(RECOMMENDED_SITES)
    },
    listWorkspaceFiles() {
      return Promise.resolve(WORKSPACE_FILES)
    },
    readFilePreview(_scope, path) {
      return Promise.resolve({ path, lines: MOCK_FILE_LINES })
    },
    getChangeSet() {
      return Promise.resolve(CHANGE_SET)
    },
  }
}
