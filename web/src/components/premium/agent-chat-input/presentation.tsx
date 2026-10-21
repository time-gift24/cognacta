import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Attachment01Icon,
  Cancel01Icon,
  CheckIcon,
  File01Icon,
  Globe02Icon,
  Loading03Icon,
  Mic01Icon,
  PackageIcon,
  StopIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import type {
  AgentComposerIconProps,
  AgentComposerPresentation,
} from "@/components/beui/premium/agent-chat-input/composition";
import { AnimatedModal } from "@/components/motion/animated-modal";
import { cn } from "@/lib/utils";

function icon(glyph: IconSvgElement, className?: string) {
  return function Icon(props: AgentComposerIconProps) {
    return (
      <HugeiconsIcon
        {...props}
        icon={glyph}
        className={cn(props.className, className)}
      />
    );
  };
}

export const AGENT_COMPOSER_PRESENTATION: AgentComposerPresentation = {
  icons: {
    attach: icon(Attachment01Icon),
    voice: icon(Mic01Icon),
    send: icon(ArrowUp01Icon),
    stop: icon(StopIcon, "size-5"),
    spinner: icon(Loading03Icon),
    search: icon(Globe02Icon),
    chevron: icon(ArrowDown01Icon),
    check: icon(CheckIcon),
    skill: icon(PackageIcon),
    close: icon(Cancel01Icon),
    file: icon(File01Icon),
  },
  classNames: {
    editor: "w-full overflow-y-auto whitespace-pre-wrap break-words px-2.5 pt-2.5 pb-2 text-base leading-6 outline-none",
    creditsEditor: "min-h-10 px-2.5 pt-2 pb-2 !text-sm leading-5",
    creditsShell: "chat-composer-shell relative w-full max-w-3xl bg-muted p-[3px] transition-[border-radius] duration-200",
    creditsShellOpen: "rounded-t-none rounded-b-[20px]",
    creditsShellClosed: "rounded-[20px]",
    search: "relative h-9 shrink-0 overflow-hidden rounded-full text-sm transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    searchEnabled: "bg-primary/10 text-primary",
    action: "grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    fallbackAction: "size-10 rounded-full active:scale-95",
    attachment: "group flex h-9 min-w-0 shrink-0 items-center gap-1.5 rounded-[10px] border border-border/70 bg-background/90 p-1 pr-0.5",
  },
  editorLineHeightRem: 1.25,
  creditsMinRows: 2,
  attachmentMotion: {
    initial: { opacity: 0, scale: 0.85 },
    exit: { opacity: 0, scale: 0.85, transition: { duration: 0.15 } },
    transition: { duration: 0.25, ease: [0.165, 0.84, 0.44, 1] },
  },
  imagePreviewModal: AnimatedModal,
  verticalModelPlacement: true,
};
