import { useEffect, useRef, useState } from "react"
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons-pro/core-stroke-rounded"

import "./swipe-toast.css"

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const FLICK = 0.11
const DEAD_ZONE = 3
const RESIST_PX = 24
const COLLAPSE_MS = 200
const EXIT = 0.7
const BURN = [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }]
const HAS_STARTING_STYLE =
  typeof window !== "undefined" && "CSSStartingStyleRule" in window

const rubberband = (over: number, dim: number, c = 0.55) =>
  (over * dim * c) / (dim + c * Math.abs(over))
const velocityOf = (hist: readonly (readonly [number, number])[]) => {
  if (hist.length < 2) return 0
  const [t0, y0] = hist[0]
  const [t1, y1] = hist[hist.length - 1]
  return performance.now() - t1 > 100 ? 0 : (y1 - y0) / Math.max(1, t1 - t0)
}

type SwipeToastProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  actionLabel?: React.ReactNode
  onAction?: () => void
  open?: boolean
  onClose?: (reason: string) => void
  background?: string
  color?: string
  fuseColor?: string
  width?: number
  radius?: number
  slideMs?: number
  settleBounce?: number
  swipeDistance?: number
  duration?: number
  fuse?: "bottom" | "top" | "none"
  pauseOnHover?: boolean
  closeButton?: boolean
  inline?: boolean
  dismissible?: boolean
  role?: "status" | "alert"
  className?: string
}

export default function SwipeToast({
  title = "File archived",
  description = "",
  icon,
  actionLabel = "",
  onAction,
  open = true,
  onClose,
  background = "#27272a",
  color = "#f5f5f5",
  fuseColor = "#f5a524",
  width = 356,
  radius = 12,
  slideMs = 400,
  settleBounce = 0.2,
  swipeDistance = 40,
  duration = 4000,
  fuse = "bottom",
  pauseOnHover = true,
  closeButton = false,
  inline = false,
  dismissible = true,
  role = "status",
  className = "",
}: SwipeToastProps) {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<"open" | "closing" | "gone">("open")
  const [instant, setInstant] = useState(false)
  const [mounted, setMounted] = useState(HAS_STARTING_STYLE)
  const cardRef = useRef<HTMLDivElement>(null)
  const fuseRef = useRef<HTMLElement>(null)
  const anim = useRef<Animation | null>(null)
  const drag = useRef<{
    id: number
    startY: number
    grab: number | null
    moved: boolean
    hist: [number, number][]
  } | null>(null)
  const flags = useRef({
    hover: false,
    interacting: false,
    focus: false,
    hidden: false,
  })
  const lastInput = useRef("pointer")
  const pendingClose = useRef<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const reason = useRef("timeout")
  const leaving = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const latest = useRef({
    onClose,
    onAction,
    slideMs,
    inline,
  })
  latest.current = { onClose, onAction, slideMs, inline }

  const y = useMotionValue(0)
  const fade = useMotionValue(1)
  const transform = useTransform(y, (v) => `translateY(${v}px)`)

  useEffect(() => {
    if (!HAS_STARTING_STYLE) requestAnimationFrame(() => setMounted(true))
  }, [])

  useEffect(() => {
    const node = fuseRef.current
    if (phase !== "open" || duration <= 0 || !node) return undefined
    anim.current?.cancel()
    const animation = node.animate(BURN, {
      duration,
      easing: "linear",
      fill: "forwards",
    })
    animation.onfinish = () => close("timeout")
    anim.current = animation
    syncFuse()
    return () => {
      animation.onfinish = null
      animation.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, duration])

  useEffect(() => {
    if (!pauseOnHover) {
      flags.current.hover = false
      syncFuse()
    }
  }, [pauseOnHover])

  useEffect(() => {
    const onVisibility = () => {
      flags.current.hidden = document.hidden
      syncFuse()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      clearTimeout(closeTimer.current)
      anim.current?.cancel()
    }
  }, [])

  useEffect(() => {
    if (!open) close("programmatic")
    else if (phaseRef.current !== "open") rescue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function syncFuse() {
    const animation = anim.current
    if (!animation) return
    const current = flags.current
    if (current.hover || current.interacting || current.focus || current.hidden)
      animation.pause()
    else if (animation.playState === "paused") animation.play()
  }

  function finish(why: string) {
    setPhase("gone")
    leaving.current = false
    if (latest.current.inline)
      closeTimer.current = setTimeout(
        () => latest.current.onClose?.(why),
        COLLAPSE_MS
      )
    else latest.current.onClose?.(why)
  }

  function close(why: string) {
    if (phaseRef.current !== "open" || leaving.current) return
    if (drag.current) {
      pendingClose.current = why
      return
    }
    anim.current?.pause()
    reason.current = why
    const now =
      why === "escape" ||
      ((why === "action" || why === "close") &&
        lastInput.current === "keyboard")
    setInstant(now)
    setPhase("closing")
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(
      () => finish(why),
      now ? 0 : latest.current.slideMs * EXIT + 60
    )
  }

  function rescue() {
    clearTimeout(closeTimer.current)
    setInstant(false)
    y.set(0)
    fade.set(1)
    setPhase("open")
  }

  function swipeOut(dy: number, v: number) {
    anim.current?.pause()
    leaving.current = true
    pendingClose.current = null
    if (!reduce && cardRef.current) {
      animate(y, dy + cardRef.current.offsetHeight, {
        type: "spring",
        duration: 0.3,
        bounce: 0,
        velocity: v * 1000,
      })
    }
    animate(fade, 0, { duration: 0.2, ease: EASE_OUT }).then(() =>
      finish("swipe")
    )
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    lastInput.current = "pointer"
    if (
      e.button !== 0 ||
      !dismissible ||
      drag.current ||
      leaving.current ||
      (e.target as HTMLElement).closest("button")
    )
      return
    if (phaseRef.current === "closing") rescue()
    try {
      cardRef.current?.setPointerCapture(e.pointerId)
    } catch {
      // Pointer capture is best effort.
    }
    y.stop()
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      grab: null,
      moved: false,
      hist: [[performance.now(), y.get()]],
    }
    flags.current.interacting = true
    syncFuse()
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.id !== e.pointerId) return
    if (current.grab === null) {
      if (Math.abs(e.clientY - current.startY) < DEAD_ZONE) return
      current.grab = e.clientY - y.get()
      if (cardRef.current) cardRef.current.dataset.swiping = ""
    }
    const raw = e.clientY - current.grab
    const next = raw >= 0 ? raw : rubberband(raw, RESIST_PX)
    y.set(next)
    current.moved = true
    current.hist.push([performance.now(), next])
    if (current.hist.length > 4) current.hist.shift()
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.id !== e.pointerId) return
    drag.current = null
    if (cardRef.current) delete cardRef.current.dataset.swiping
    try {
      cardRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // Pointer capture is best effort.
    }
    flags.current.interacting = false
    const dy = y.get()
    const v = velocityOf(current.hist)
    if (dy > 0 && (v > FLICK || (dy >= swipeDistance && v >= 0))) {
      swipeOut(dy, v)
      return
    }
    if (current.moved) {
      animate(
        y,
        0,
        reduce
          ? { duration: 0.2, ease: EASE_OUT }
          : {
              type: "spring",
              duration: 0.5,
              bounce: settleBounce,
              velocity: v * 1000,
            }
      )
    }
    const queued = pendingClose.current
    pendingClose.current = null
    if (queued) close(queued)
    else syncFuse()
  }

  return (
    <div
      className={`swipe-toast${className ? ` ${className}` : ""}`}
      data-phase={phase}
      data-inline={inline ? "true" : "false"}
      data-fuse={duration > 0 ? fuse : "none"}
      data-dismissible={dismissible ? "true" : "false"}
      data-instant={instant ? "" : undefined}
      data-mounted={mounted ? "true" : "false"}
      style={
        {
          "--st-bg": background,
          "--st-ink": color,
          "--st-fuse": fuseColor,
          "--st-w": `${width}px`,
          "--st-radius": `${radius}px`,
          "--st-slide": `${slideMs}ms`,
          "--st-gap": "10px",
        } as React.CSSProperties
      }
    >
      <div className="swipe-toast__gate">
        <div className="swipe-toast__lift">
          <motion.div
            ref={cardRef}
            className="swipe-toast__card"
            role={role}
            aria-live={role === "alert" ? "assertive" : "polite"}
            aria-atomic="true"
            tabIndex={0}
            style={{ transform, opacity: fade }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerEnter={(e) => {
              if (pauseOnHover && e.pointerType === "mouse") {
                flags.current.hover = true
                syncFuse()
              }
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") {
                flags.current.hover = false
                syncFuse()
              }
            }}
            onFocus={() => {
              flags.current.focus = true
              syncFuse()
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                flags.current.focus = false
                syncFuse()
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                lastInput.current = "keyboard"
              if (e.key === "Escape" && dismissible) {
                e.stopPropagation()
                close("escape")
              }
            }}
          >
            {icon ? (
              <span className="swipe-toast__icon" aria-hidden="true">
                {icon}
              </span>
            ) : null}
            <span className="swipe-toast__body">
              <span className="swipe-toast__title">{title}</span>
              {description ? (
                <span className="swipe-toast__desc">{description}</span>
              ) : null}
            </span>
            {actionLabel ? (
              <button
                type="button"
                className="swipe-toast__action"
                onClick={() => {
                  latest.current.onAction?.()
                  close("action")
                }}
              >
                {actionLabel}
              </button>
            ) : null}
            {closeButton ? (
              <button
                type="button"
                className="swipe-toast__close"
                aria-label="关闭提示"
                onClick={() => close("close")}
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={12}
                  strokeWidth={2.5}
                />
              </button>
            ) : null}
            <i ref={fuseRef} className="swipe-toast__fuse" aria-hidden="true" />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
