"use client";

import { ArrowUp, LoaderCircle, Paperclip, Square } from "lucide-react";
import {
  type ComponentProps,
  type ComponentType,
  createContext,
  type ReactNode,
  useContext,
} from "react";
import { Button } from "@/components/beui/motion/button";
import type { MotionProps } from "motion/react";
import type { AnimatedModal } from "@/components/beui/motion/animated-modal";
import { cn } from "@/lib/beui/utils";
import {
  type AgentChatCreditsLabels,
  DEFAULT_CREDITS_LABELS,
} from "./credits-labels";

export type AgentComposerIconProps = {
  className?: string;
  "aria-hidden"?: boolean;
  strokeWidth?: number;
};

/** Presentation differences shared by the existing composer parts. */
export type AgentComposerPresentation = {
  icons?: Partial<Record<
    "attach" | "voice" | "send" | "stop" | "spinner" | "search" | "chevron" | "check" | "skill" | "close" | "file",
    ComponentType<AgentComposerIconProps>
  >>;
  classNames?: Partial<Record<
    "editor" | "creditsEditor" | "creditsShell" | "creditsShellOpen" | "creditsShellClosed" | "search" | "searchEnabled" | "action" | "fallbackAction" | "attachment",
    string
  >>;
  editorLineHeightRem?: number;
  creditsMinRows?: number;
  attachmentMotion?: Pick<MotionProps, "initial" | "exit" | "transition">;
  imagePreviewModal?: typeof AnimatedModal;
  verticalModelPlacement?: boolean;
};

const DEFAULT_PRESENTATION: AgentComposerPresentation = {};

export type AgentComposerModelProps = {
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
};
export type AgentComposerActionProps = {
  className?: string;
  showSpinner?: boolean;
};
export type AgentComposerParts = {
  input: ReactNode;
  toolbar: ReactNode;
  attachments?: ReactNode;
  header?: ReactNode;
  options?: ReactNode;
  model?: ReactNode | ((props: AgentComposerModelProps) => ReactNode);
  action?: ReactNode | ((props: AgentComposerActionProps) => ReactNode);
  attach?: ReactNode;
  voice?: ReactNode;
  search?: ReactNode;
  agent?: ReactNode;
  error?: ReactNode;
};
/** Replace individual parts while preserving a variant’s animated shell. */
export type AgentComposerSlots = Partial<
  Pick<AgentComposerParts, "input" | "toolbar" | "attachments">
>;

export type AgentComposerState = {
  text: string;
  model: string;
  models: readonly { id: string; label: string; icon?: ReactNode }[];
  labels?: AgentChatCreditsLabels;
  showSendingSpinner?: boolean;
  busy: boolean;
  disabled: boolean;
  canSubmit: boolean;
  setModel: (model: string) => void;
  submit: () => void | Promise<void>;
  stop?: () => void;
  attach?: () => void;
};
const Context = createContext<
  (AgentComposerState & { parts: AgentComposerParts; presentation?: AgentComposerPresentation }) | null
>(null);

/** Internal bridge: each variant owns its state and supplies its wired parts. */
export function AgentComposerProvider({
  parts,
  state,
  children,
  presentation,
}: {
  parts: AgentComposerParts;
  state: AgentComposerState;
  children: ReactNode;
  presentation?: AgentComposerPresentation;
}) {
  return (
    <Context.Provider value={{ ...state, parts, presentation }}>{children}</Context.Provider>
  );
}

export function useAgentComposerPresentation(override?: AgentComposerPresentation) {
  const context = useContext(Context);
  return override ?? context?.presentation ?? DEFAULT_PRESENTATION;
}

/** Read the nearest composer's state and invoke its guarded actions. */
export function useAgentComposer(): AgentComposerState {
  const context = useContext(Context);
  if (!context)
    throw new Error(
      "Composer parts must be inside AgentComposerProvider.",
    );
  return context;
}
function Part({
  name,
  className,
}: {
  name: keyof AgentComposerParts;
  className?: string;
}) {
  useAgentComposer();
  const context = useContext(Context);
  const part = context?.parts[name];
  const node = typeof part === "function" ? part({}) : part;
  if (node == null || node === false) return null;
  return className ? <div className={className}>{node}</div> : node;
}
/** The Credits card surface, shared by default and composed layouts. */
export function AgentComposerSurface({
  className,
  ...props
}: ComponentProps<"div">) {
  useAgentComposer();
  return (
    <div
      {...props}
      className={cn("rounded-2xl bg-background px-2 pt-1.5 pb-2", className)}
    />
  );
}
export function AgentComposerInput({ className }: { className?: string }) {
  return <Part name="input" className={className} />;
}
export function AgentComposerAttachments({
  className,
}: {
  className?: string;
}) {
  return <Part name="attachments" className={className} />;
}
export function AgentComposerHeader({ className }: { className?: string }) {
  return <Part name="header" className={className} />;
}
export function AgentComposerOptions({ className }: { className?: string }) {
  return <Part name="options" className={className} />;
}
export function AgentComposerError({ className }: { className?: string }) {
  return <Part name="error" className={className} />;
}
/** Without children, renders the variant's complete toolbar. */
export function AgentComposerToolbar({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  useAgentComposer();
  return children === undefined ? (
    <Part name="toolbar" className={className} />
  ) : (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-2 [&>[data-composer-action]]:ml-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
/** Unsupported tools render nothing; available tools retain their variant's behavior. */
export function AgentComposerVoice({ className }: { className?: string }) {
  return <Part name="voice" className={className} />;
}
export function AgentComposerSearch({ className }: { className?: string }) {
  return <Part name="search" className={className} />;
}
export function AgentComposerAgent({ className }: { className?: string }) {
  return <Part name="agent" className={className} />;
}
export function AgentComposerAttach({ className }: { className?: string }) {
  const presentation = useAgentComposerPresentation();
  const AttachIcon = presentation.icons?.attach ?? Paperclip;
  const {
    attach,
    busy,
    disabled,
    labels = DEFAULT_CREDITS_LABELS,
  } = useAgentComposer();
  const context = useContext(Context);
  if (context && context.parts.attach !== undefined)
    return <Part name="attach" className={className} />;
  return (
    <Button
      tabIndex={0}
      type="button"
      variant="outline"
      size="icon"
      aria-label={labels.attachFiles}
      disabled={disabled || busy || !attach}
      onClick={attach}
      className={cn(
        "size-10 rounded-full bg-background hover:bg-muted",
        className,
      )}
    >
      <AttachIcon aria-hidden className="size-5" />
    </Button>
  );
}
export function AgentComposerModel({
  className,
  side,
  align,
}: AgentComposerModelProps) {
  useAgentComposer();
  const context = useContext(Context);
  const part = context?.parts.model;
  if (typeof part === "function")
    return <>{part({ className, side, align })}</>;
  return <Part name="model" className={className} />;
}

export function AgentComposerAction({
  className,
  showSpinner,
}: AgentComposerActionProps) {
  const presentation = useAgentComposerPresentation();
  const StopIcon = presentation.icons?.stop ?? Square;
  const SpinnerIcon = presentation.icons?.spinner ?? LoaderCircle;
  const SendIcon = presentation.icons?.send ?? ArrowUp;
  const {
    busy,
    disabled,
    canSubmit,
    submit,
    stop,
    labels = DEFAULT_CREDITS_LABELS,
    showSendingSpinner = true,
  } = useAgentComposer();
  const context = useContext(Context);
  if (context && context.parts.action !== undefined) {
    const part = context.parts.action;
    const node = typeof part === "function" ? part({ showSpinner }) : part;
    if (node == null || node === false) return null;
    return (
      <div
        data-composer-action=""
        className={cn("flex shrink-0 items-center", className)}
      >
        {node}
      </div>
    );
  }
  return (
    <Button
      tabIndex={0}
      type="button"
      size="icon"
      aria-label={
        busy
          ? stop
            ? labels.stopResponse
            : labels.sendingPrompt
          : labels.sendMessage
      }
      disabled={disabled || (busy ? !stop : !canSubmit)}
      onClick={() => {
        if (busy) stop?.();
        else void submit();
      }}
      data-composer-action=""
      className={cn(presentation.classNames?.fallbackAction ?? "size-10 rounded-full", className)}
    >
      {busy ? (
        stop ? (
          <StopIcon aria-hidden className="size-4 fill-current" />
        ) : (showSpinner ?? showSendingSpinner) ? (
          <SpinnerIcon
            aria-hidden
            className="size-4 motion-safe:animate-spin"
          />
        ) : (
          <SendIcon aria-hidden className="size-5" />
        )
      ) : (
        <SendIcon aria-hidden className="size-5" />
      )}
    </Button>
  );
}
