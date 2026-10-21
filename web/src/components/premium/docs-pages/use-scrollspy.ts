"use client"

import type { RefObject } from "react"
import { useScrollspy as useBeuiScrollspy } from "@/components/beui/premium/docs-pages/use-scrollspy"
import { findDocsHeading } from "./docs-data"

export function useScrollspy(
  ids: readonly string[],
  containerRef: RefObject<HTMLElement | null>
) {
  return useBeuiScrollspy(ids, containerRef, findDocsHeading)
}
