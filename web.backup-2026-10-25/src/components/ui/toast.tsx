import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons-pro/core-stroke-rounded"
import SwipeToast from "./swipe-toast"

export type ToastTone = "info" | "success" | "error"

export type ToastInput = {
  title: ReactNode
  description?: ReactNode
  tone?: ToastTone
  /** Milliseconds before dismissal; 0 keeps it until closed. */
  duration?: number
  actionLabel?: ReactNode
  onAction?: () => void
  /** Replaces an existing toast with the same key instead of stacking. */
  key?: string
}

export type ToastApi = {
  notify: (input: ToastInput) => number
  dismiss: (id: number) => void
  dismissKey: (key: string) => void
}

type ToastRecord = Required<Pick<ToastInput, "tone">> &
  Omit<ToastInput, "tone"> & { id: number }

const ToastContext = createContext<ToastApi | null>(null)
const TONE_ICON = {
  info: InformationCircleIcon,
  success: CheckmarkCircle02Icon,
  error: AlertCircleIcon,
}
const DEFAULT_DURATION = {
  info: 4000,
  success: 3200,
  error: 0,
}
const MAX_TOASTS = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastRecord[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const dismissKey = useCallback((key: string) => {
    setToasts((current) => current.filter((toast) => toast.key !== key))
  }, [])

  const notify = useCallback((input: ToastInput) => {
    const id = ++nextId.current
    setToasts((current) => {
      const withoutKey = input.key
        ? current.filter((toast) => toast.key !== input.key)
        : current
      return [
        ...withoutKey.slice(-(MAX_TOASTS - 1)),
        { ...input, tone: input.tone ?? "info", id },
      ]
    })
    return id
  }, [])

  const api = useMemo(
    () => ({ notify, dismiss, dismissKey }),
    [notify, dismiss, dismissKey]
  )

  return (
    <ToastContext.Provider value={api}>
      {toasts.length ? (
        <div
          role="region"
          aria-label="通知"
          className="pointer-events-none fixed right-4 bottom-4 z-[130] flex w-[min(356px,calc(100vw-2rem))] flex-col items-stretch sm:right-8 sm:bottom-8"
        >
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <SwipeToast
                inline
                role={toast.tone === "error" ? "alert" : "status"}
                title={toast.title}
                description={toast.description}
                icon={
                  <HugeiconsIcon
                    icon={TONE_ICON[toast.tone]}
                    className={
                      toast.tone === "error"
                        ? "text-destructive"
                        : toast.tone === "success"
                          ? "text-primary"
                          : "text-muted-foreground"
                    }
                    aria-hidden="true"
                  />
                }
                actionLabel={toast.actionLabel}
                onAction={toast.onAction}
                duration={toast.duration ?? DEFAULT_DURATION[toast.tone]}
                closeButton={toast.tone === "error"}
                background="var(--popover)"
                color="var(--popover-foreground)"
                fuseColor={
                  toast.tone === "error"
                    ? "var(--destructive)"
                    : "var(--primary)"
                }
                onClose={() => dismiss(toast.id)}
              />
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error("ToastProvider is required")
  return toast
}
