// Adapted from @beui-pro/docs-article · beui.collectui.pro
export type DocsSection = { id: string; label: string; level: number }
export const docsSectionId = (id: string) => `skill-docs-${id}`

/** Markdown slugs belong to one reader; HTML IDs are unique per instance. */
export function findDocsHeading(container: HTMLElement | null, id: string) {
  return (
    container?.querySelector<HTMLElement>(
      `[data-docs-section="${CSS.escape(id)}"]`
    ) ?? null
  )
}
