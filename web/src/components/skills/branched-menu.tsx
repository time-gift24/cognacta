// Adapted from React Bits BranchedMenu (reactbits.dev) — TypeScript port.
// Extended with a controlled `active` prop, per-item badges and an aria label.
"use client"

import {
  isValidElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons-pro/core-stroke-rounded"
import { SPRING_GLIDE } from "@/lib/ease"
import "./branched-menu.css"

export type BranchedMenuChild = {
  value: string
  label: string
  /** Non-selectable rows toggle their descendants instead of navigating. */
  selectable?: boolean
  /** Additional heading levels below the first branch row. */
  depth?: number
  icon?: IconSvgElement | ReactNode
  badge?: ReactNode
}

export type BranchedMenuItem = {
  label: string
  value?: string
  selectable?: boolean
  icon?: IconSvgElement | ReactNode
  badge?: ReactNode
  children?: readonly BranchedMenuChild[]
}

export type BranchedMenuProps = {
  items: readonly BranchedMenuItem[]
  /** Controlled selected value. Leave undefined to manage selection internally. */
  active?: string
  defaultOpen?: number | readonly number[] | "all"
  defaultActive?: string
  /** Parent labels navigate; a separate button toggles their descendants. */
  selectableParents?: boolean
  onSelect?: (value: string, item: BranchedMenuItem | BranchedMenuChild) => void
  onToggle?: (index: number, open: boolean) => void
  /** Optional sibling controls, outside the row's navigation button. */
  renderActions?: (value: string) => ReactNode
  /** Replaces the row button while a consumer edits its name. */
  renderEditor?: (value: string) => ReactNode
  ariaLabel?: string
  color?: string
  accentColor?: string
  lineColor?: string
  width?: number
  rowHeight?: number
  indent?: number
  trunk?: number
  radius?: number
  lineWidth?: number
  fontSize?: number
  drawDuration?: number
  className?: string
}

const PAD = 6
const MARK = 16
const DEPTH_STEP = 12

const renderIcon = (icon: IconSvgElement | ReactNode) =>
  isValidElement(icon) ? (
    icon
  ) : (
    <HugeiconsIcon icon={icon as IconSvgElement} size={16} strokeWidth={1.7} />
  )

const toSet = (open: number | readonly number[]): ReadonlySet<number> =>
  new Set(typeof open === "number" ? (open >= 0 ? [open] : []) : open)

function MenuToggle({
  label,
  open,
  onClick,
  tabIndex,
  controls,
}: {
  label: string
  open: boolean
  onClick: () => void
  tabIndex?: number
  controls?: string
}) {
  const action = `${open ? "收起" : "展开"}${label}`
  return (
    <button
      type="button"
      className="branched-menu__toggle"
      aria-label={action}
      title={action}
      aria-expanded={open}
      aria-controls={controls}
      tabIndex={tabIndex}
      onClick={onClick}
    >
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={12}
        className="size-3"
        aria-hidden="true"
      />
    </button>
  )
}

export function BranchedMenu({
  items,
  active: controlledActive,
  defaultOpen = 0,
  defaultActive = "",
  selectableParents = false,
  onSelect,
  onToggle,
  renderActions,
  renderEditor,
  ariaLabel,
  color = "#f5f5f5",
  accentColor = "#f5f5f5",
  lineColor = "#3f3f46",
  width = 240,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  className = "",
}: BranchedMenuProps) {
  const [open, setOpen] = useState<ReadonlyMap<string, boolean>>(
    () => new Map()
  )
  const initiallyOpen = defaultOpen === "all" ? null : toSet(defaultOpen)
  const [internalActive, setInternalActive] = useState(() => {
    if (defaultActive) return defaultActive
    const first = items.find(
      (item, index) =>
        item.children &&
        (defaultOpen === "all" || toSet(defaultOpen).has(index))
    )
    return first?.children?.[0]?.value ?? ""
  })
  const active = controlledActive ?? internalActive
  const id = useId()
  const groups = items.map((item, index) => {
    const key = item.value ?? item.label
    const isOpen =
      Boolean(item.children?.length) &&
      (open.get(key) ?? (initiallyOpen === null || initiallyOpen.has(index)))
    let hiddenParent: BranchedMenuChild | undefined
    let visibleActive = active
    const rows = (item.children ?? []).flatMap((kid, k, siblings) => {
      if (hiddenParent && (kid.depth ?? 0) > (hiddenParent.depth ?? 0)) {
        if (kid.value === active) visibleActive = hiddenParent.value
        return []
      }
      hiddenParent = undefined
      const key = `${item.value ?? item.label}\0${kid.value}`
      const isOpen = open.get(key) ?? true
      const hasChildren =
        k + 1 < siblings.length &&
        (siblings[k + 1].depth ?? 0) > (kid.depth ?? 0)
      if (hasChildren && !isOpen) hiddenParent = kid
      return [{ kid, key, isOpen, hasChildren }]
    })
    return { item, key, isOpen, rows, visibleActive }
  })
  const navRef = useRef<HTMLElement>(null)
  const heads = useRef<(HTMLDivElement | null)[]>([])
  const markerRef = useRef<HTMLSpanElement>(null)

  const activeSection = items.findIndex((item) =>
    item.children?.some((kid) => kid.value === active)
  )
  const markerShown = activeSection >= 0 && groups[activeSection].isOpen
  useLayoutEffect(() => {
    const place = (glide: boolean) => {
      const marker = markerRef.current
      const head = heads.current[activeSection]
      if (!marker) return
      const on = markerShown && head
      if (!glide) marker.style.transition = "none"
      if (on && head)
        marker.style.top = `${head.offsetTop + (head.offsetHeight - MARK) / 2}px`
      marker.toggleAttribute("data-on", Boolean(on))
      if (!glide) {
        void marker.offsetHeight
        marker.style.transition = ""
      }
    }
    place(true)
    let first = true
    const observer = new ResizeObserver(() => {
      if (first) {
        first = false
        return
      }
      place(false)
    })
    if (navRef.current) observer.observe(navRef.current)
    return () => observer.disconnect()
  }, [activeSection, markerShown, items, fontSize, rowHeight])

  const reduceMotion = useReducedMotion()

  const select = (
    value: string,
    item: BranchedMenuItem | BranchedMenuChild
  ) => {
    setInternalActive(value)
    onSelect?.(value, item)
  }
  const toggle = (key: string, isOpen: boolean, index?: number) => {
    setOpen((previous) => {
      const next = new Map(previous)
      next.set(key, !(previous.get(key) ?? isOpen))
      return next
    })
    if (index !== undefined) onToggle?.(index, !isOpen)
  }

  const r = Math.min(radius, rowHeight / 2 - 2)
  const rowY = (k: number) => PAD + k * rowHeight + rowHeight / 2

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className={`branched-menu${className ? ` ${className}` : ""}`}
      style={
        {
          "--bm-w": `${width}px`,
          "--bm-ink": color,
          "--bm-accent": accentColor,
          "--bm-line": lineColor,
          "--bm-font": `${fontSize}px`,
          "--bm-row": `${rowHeight}px`,
          "--bm-indent": `${indent}px`,
          "--bm-line-w": lineWidth,
          "--bm-draw": `${drawDuration}ms`,
        } as CSSProperties
      }
    >
      <span
        ref={markerRef}
        className="branched-menu__marker"
        aria-hidden="true"
      />
      {groups.map(({ item, key, isOpen, rows, visibleActive }, index) => {
        const kids = rows.length ? rows.map((row) => row.kid) : undefined
        const leafValue = item.value ?? item.label
        const leafActive = (!kids || selectableParents) && leafValue === active
        const activeAncestor =
          selectableParents &&
          !isOpen &&
          item.children?.some((kid) => kid.value === active)
        const bodyHeight = kids ? PAD * 2 + kids.length * rowHeight : 0
        const ancestors: number[] = []
        const stems = new Map<
          number,
          { x: number; start: number; end: number }
        >()
        const branches = (kids ?? []).map((kid, k, siblings) => {
          const depth = kid.depth ?? 0
          while (
            ancestors.length &&
            (siblings[ancestors[ancestors.length - 1]].depth ?? 0) >= depth
          )
            ancestors.pop()
          const parent = ancestors.at(-1) ?? -1
          const x =
            trunk +
            (parent < 0 ? 0 : (siblings[parent].depth ?? 0) + 1) * DEPTH_STEP
          const start = parent < 0 ? 0 : rowY(parent)
          const y = rowY(k)
          const end = indent - 8 + depth * DEPTH_STEP
          const corner = `A ${r} ${r} 0 0 0 ${x + r} ${y} H ${end}`
          stems.set(parent, { x, start, end: y - r })
          ancestors.push(k)
          return {
            parent,
            branch: `M ${x} ${y - r} ${corner}`,
            reach: `M ${x} ${start} V ${y - r} ${corner}`,
          }
        })
        const activeBranches = new Set<number>()
        for (
          let k = kids?.findIndex((kid) => kid.value === visibleActive) ?? -1;
          k >= 0;
          k = branches[k].parent
        )
          activeBranches.add(k)
        return (
          <div
            key={key}
            className="branched-menu__section"
            data-open={isOpen ? "" : undefined}
          >
            <div
              className="branched-menu__row"
              data-menu-value={leafValue}
              data-disclosure={kids && selectableParents ? "" : undefined}
              ref={(element) => {
                heads.current[index] = element
              }}
            >
              {renderEditor?.(leafValue) ?? (
                <button
                  type="button"
                  className="branched-menu__head justify-start"
                  title={item.label}
                  aria-expanded={
                    kids && !selectableParents ? isOpen : undefined
                  }
                  aria-controls={
                    kids && !selectableParents ? `${id}-${index}` : undefined
                  }
                  aria-current={leafActive ? "true" : undefined}
                  data-active={leafActive || activeAncestor ? "" : undefined}
                  onClick={() =>
                    kids && (!selectableParents || item.selectable === false)
                      ? toggle(key, isOpen, index)
                      : item.selectable !== false && select(leafValue, item)
                  }
                >
                  {item.icon ? (
                    <span className="branched-menu__icon" aria-hidden="true">
                      {renderIcon(item.icon)}
                    </span>
                  ) : null}
                  <span className="branched-menu__label">{item.label}</span>
                  {item.badge ? (
                    <span className="branched-menu__badge">{item.badge}</span>
                  ) : null}
                </button>
              )}
              {kids && selectableParents ? (
                <MenuToggle
                  label={item.label}
                  open={isOpen}
                  controls={`${id}-${index}`}
                  onClick={() => toggle(key, isOpen, index)}
                />
              ) : null}
              {renderActions?.(leafValue)}
            </div>
            {kids ? (
              <div className="branched-menu__body">
                <motion.div
                  className="branched-menu__fold"
                  id={`${id}-${index}`}
                  inert={!isOpen}
                  aria-hidden={!isOpen}
                  initial={false}
                  animate={{ height: isOpen ? bodyHeight : 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", ...SPRING_GLIDE }
                  }
                >
                  <div
                    className="branched-menu__tree"
                    style={{ height: bodyHeight }}
                  >
                    <svg
                      className="branched-menu__lines"
                      width={
                        indent +
                        kids.reduce(
                          (max, kid) => Math.max(max, kid.depth ?? 0),
                          0
                        ) *
                          DEPTH_STEP
                      }
                      height={bodyHeight}
                      aria-hidden="true"
                    >
                      {[...stems].map(([parent, stem]) => (
                        <path
                          key={parent}
                          className="branched-menu__base"
                          d={`M ${stem.x} ${stem.start} V ${stem.end}`}
                        />
                      ))}
                      {kids.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="branched-menu__base"
                          d={branches[k].branch}
                        />
                      ))}
                      {kids.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="branched-menu__reach"
                          d={branches[k].reach}
                          pathLength={1}
                          style={{
                            strokeDasharray: 1,
                            strokeDashoffset: activeBranches.has(k) ? 0 : 1,
                          }}
                        />
                      ))}
                    </svg>
                    {rows.map(
                      ({ kid, key, isOpen: childOpen, hasChildren }) => (
                        <div
                          key={key}
                          className="branched-menu__row"
                          data-menu-value={kid.value}
                          data-disclosure={hasChildren ? "" : undefined}
                        >
                          {renderEditor?.(kid.value) ?? (
                            <button
                              type="button"
                              className="branched-menu__item justify-start"
                              title={kid.label}
                              style={
                                kid.depth
                                  ? {
                                      paddingInlineStart:
                                        indent + kid.depth * DEPTH_STEP,
                                    }
                                  : undefined
                              }
                              aria-current={
                                kid.value === active ? "true" : undefined
                              }
                              data-active={
                                kid.value === visibleActive ? "" : undefined
                              }
                              tabIndex={isOpen ? 0 : -1}
                              onClick={() =>
                                kid.selectable === false
                                  ? hasChildren && toggle(key, childOpen)
                                  : select(kid.value, kid)
                              }
                            >
                              {kid.icon ? (
                                <span
                                  className="branched-menu__icon"
                                  aria-hidden="true"
                                >
                                  {renderIcon(kid.icon)}
                                </span>
                              ) : null}
                              <span className="branched-menu__label">
                                {kid.label}
                              </span>
                              {kid.badge ? (
                                <span className="branched-menu__badge">
                                  {kid.badge}
                                </span>
                              ) : null}
                            </button>
                          )}
                          {hasChildren ? (
                            <MenuToggle
                              label={kid.label}
                              open={childOpen}
                              tabIndex={isOpen ? 0 : -1}
                              onClick={() => toggle(key, childOpen)}
                            />
                          ) : null}
                          {renderActions?.(kid.value)}
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
