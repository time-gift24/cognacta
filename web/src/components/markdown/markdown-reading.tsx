// Markdown 阅读视图：渲染正文、提取标题大纲、提供带弹簧的标题滚动。
// SKILL 页面与 Agent 编辑页共用同一套「先查看、后编辑」逻辑。
"use client"

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react"
import {
  animate,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "motion/react"
import type { ExtraProps } from "streamdown"
import { Markdown } from "@/components/chat/markdown"
import {
  docsSectionId,
  type DocsSection,
} from "@/components/premium/docs-pages/docs-data"
import {
  BranchedMenu,
  type BranchedMenuChild,
  type BranchedMenuItem,
} from "@/components/skills/branched-menu"
import { SPRING_GLIDE } from "@/lib/ease"
import { headingSlug, splitFrontmatter } from "@/skills/content"
import "@/components/premium/docs-pages/docs-article.css"

function ReadingLink({
  href,
  children,
  node: _node,
  ...props
}: ComponentProps<"a"> & ExtraProps) {
  const local =
    href?.startsWith("/") ||
    href?.startsWith("#") ||
    href?.startsWith("https://skill.invalid/")
  return (
    <a
      {...props}
      href={href}
      target={local ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="rounded-sm text-primary underline decoration-primary/40 underline-offset-4 outline-none hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </a>
  )
}
const readingMarkdownComponents = { a: ReadingLink }

/**
 * 渲染一份 Markdown 文档的查看态：为标题分配锚点 id 并保留完整标题层级，
 * 供右侧「本页目录」使用。frontmatter 收进折叠的元数据块。
 */
export function MarkdownReading({
  source,
  linkBase,
  onSections,
  onLink,
  empty,
}: {
  source: string
  linkBase?: string
  onSections: (sections: DocsSection[]) => void
  onLink?: (event: MouseEvent<HTMLDivElement>) => void
  empty?: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const instanceId = useId()
  const { metadata, body } = splitFrontmatter(source)
  useLayoutEffect(() => {
    const used = new Map<string, number>()
    const sections = Array.from(
      root.current?.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6") ?? []
    ).map((heading) => {
      const label = heading.textContent ?? ""
      const base = headingSlug(label)
      const count = used.get(base) ?? 0
      used.set(base, count + 1)
      const id = count ? `${base}-${count}` : base
      heading.id = docsSectionId(`${instanceId}-${id}`)
      heading.dataset.docsSection = id
      return { id, label, level: Number(heading.tagName.slice(1)) }
    })
    onSections(sections)
  }, [body, instanceId, onSections])
  return (
    <div ref={root} className="doc-preview" onClickCapture={onLink}>
      {body.trim() ? (
        <Markdown
          linkBase={linkBase}
          componentOverrides={readingMarkdownComponents}
        >
          {body}
        </Markdown>
      ) : (
        (empty ?? null)
      )}
      {metadata !== null ? (
        <details className="mt-12 border-t border-border pt-5 text-sm text-muted-foreground">
          <summary className="w-fit cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            文件元数据（frontmatter）
          </summary>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-6 text-foreground">
            {metadata}
          </pre>
        </details>
      ) : null}
    </div>
  )
}

/** 右侧「本页目录」，随阅读滚动高亮当前章节。 */
export function MarkdownOutline({
  sections,
  active,
  onSelect,
}: {
  sections: readonly DocsSection[]
  active: string
  onSelect: (id: string) => void
}) {
  const items: BranchedMenuItem[] = []
  let rootLevel = 0
  let children: BranchedMenuChild[] = []
  for (const section of sections) {
    const item = { label: section.label, value: section.id }
    if (!items.length || section.level <= rootLevel) {
      children = []
      rootLevel = section.level
      items.push({ ...item, children })
    } else {
      children.push({ ...item, depth: section.level - rootLevel - 1 })
    }
  }
  return (
    <aside className="doc-outline">
      <div className="doc-outline-sticky">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          本页目录
        </p>
        <BranchedMenu
          ariaLabel="本页目录"
          items={items}
          selectableParents
          defaultOpen="all"
          active={active}
          onSelect={onSelect}
          color="var(--sidebar-foreground)"
          accentColor="var(--primary)"
          lineColor="var(--border-strong)"
          width={168}
          rowHeight={32}
          fontSize={13}
          className="branched-menu--fill"
        />
      </div>
    </aside>
  )
}

/**
 * 带弹簧的标题滚动。resolve 在调用时解析当前滚动容器（查看态容器或
 * 编辑器预览面板），尊重 prefers-reduced-motion 降级为瞬时滚动。
 */
export function useHeadingScroll(
  resolve: () => HTMLElement | null,
  targetKey?: string
) {
  const reduceMotion = useReducedMotion()
  const scrollAnimation = useRef<AnimationPlaybackControls | null>(null)
  useLayoutEffect(
    () => () => {
      scrollAnimation.current?.stop()
      scrollAnimation.current = null
    },
    [resolve, targetKey, reduceMotion]
  )
  const scrollToY = useCallback(
    (top: number) => {
      const el = resolve()
      if (!el) return
      scrollAnimation.current?.stop()
      if (reduceMotion) {
        el.scrollTop = top
        return
      }
      scrollAnimation.current = animate(el.scrollTop, top, {
        ...SPRING_GLIDE,
        type: "spring",
        onUpdate: (value) => {
          el.scrollTop = value
        },
      })
    },
    [reduceMotion, resolve]
  )
  const scrollToHeading = useCallback(
    (node: HTMLElement) => {
      const el = resolve()
      if (!el) return
      // 2rem scroll-margin-top，与 .doc-preview 标题的 scroll-margin 对齐。
      const top =
        node.getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop -
        32
      scrollToY(Math.max(0, top))
    },
    [scrollToY, resolve]
  )
  return { scrollToY, scrollToHeading }
}
