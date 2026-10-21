import type { RecommendedSite } from "@/workbench/backend"

/** Shared initial shortcuts; these are not browser history. */
export const RECOMMENDED_SITES: readonly RecommendedSite[] = [
  { name: "Cognacta", url: "github.com/time-gift24/cognacta", initial: "C" },
  { name: "Vite 开发服务", url: "127.0.0.1:5173", initial: "V" },
  { name: "Microsoft 必应", url: "bing.com", initial: "必" },
  { name: "Pydantic 文档", url: "docs.pydantic.dev", initial: "P" },
]
