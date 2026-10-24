"use client";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
} from "motion/react";
import { useId } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  PanelLeft,
  Plus,
  BookOpen,
  Archive,
  LayoutGrid,
} from "@/components/icons";
import { EASE_OUT, SPRING_SWAP, SPRING_PANEL } from "@/lib/ease";
import { ProfileMenu } from "../profile-menu";
import { modes } from "./config";
import { ProjectGroup } from "./project-group";
import type { Mode } from "./types";
import { useSessions } from "./session-provider";
import { SessionRow } from "./sessions/session-row";
export function SidebarContent({
  mode,
  onModeChange,
  activeThread,
  onNewChat,
  onSelectThread,
  onSearch,
  onCollapse,
}: {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  activeThread: string | null;
  onNewChat: () => void;
  onSelectThread: (thread: string) => void;
  onSearch: () => void;
  onCollapse: () => void;
}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const pillId = useId();
  const { sessions, projects } = useSessions();
  return (
    <div className="flex h-full w-[248px] flex-col px-2.5 py-3">
      <div className="mb-1 flex h-10 shrink-0 items-center gap-1 pl-3 pr-0">
        <button
          type="button"
          onClick={onNewChat}
          className="mr-auto rounded-md font-semibold text-xl tracking-tight focus-visible:outline-2 focus-visible:outline-primary"
        >
          Cognacta
        </button>
        <button
          type="button"
          aria-label="Search conversations"
          onClick={onSearch}
          className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-surface-active focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Search className="size-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={onCollapse}
          className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-surface-active focus-visible:outline-2 focus-visible:outline-primary"
        >
          <PanelLeft className="size-[18px]" />
        </button>
      </div>
      <nav
        aria-label="Workspace modes"
        className="mb-3 grid shrink-0 grid-cols-3 gap-1"
      >
        {modes.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            aria-pressed={mode === label}
            onClick={() => onModeChange(label)}
            className={`relative isolate flex h-10 items-center justify-center gap-1 rounded-lg text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary ${mode === label ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {mode === label ? (
              <motion.span
                aria-hidden="true"
                layoutId={reduce ? undefined : pillId}
                transition={reduce ? { duration: 0 } : SPRING_SWAP}
                className="absolute inset-x-0 inset-y-1 -z-10 rounded-lg bg-surface-active"
              />
            ) : null}
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </nav>
      <nav aria-label="Workspace navigation" className="space-y-0.5">
        {[
          { label: "New Chat", icon: Plus, onClick: onNewChat },
          {
            label: "Knowledge base",
            icon: BookOpen,
            onClick: () => router.push("/knowledge-base"),
          },
          {
            label: "Archived chats",
            icon: Archive,
            onClick: () => router.push("/archived"),
          },
          {
            label: "Connected apps",
            icon: LayoutGrid,
            onClick: () => router.push("/integrations"),
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            aria-current={
              (item.label === "Connected apps" &&
                pathname === "/integrations") ||
              (item.label === "Knowledge base" &&
                pathname === "/knowledge-base") ||
              (item.label === "Archived chats" && pathname === "/archived")
                ? "page"
                : undefined
            }
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-muted-foreground text-sm transition-colors hover:bg-surface-active hover:text-foreground aria-[current=page]:bg-surface-active aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <item.icon className="size-4" />
            {item.label}
            {item.label === "New Chat" ? (
              <span className="ml-auto font-mono text-[10px] text-faint">
                ⌘N
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-3">
        <LayoutGroup id={`${pillId}-projects`}>
          <SidebarGroup
            label="Projects"
            action={
              <button
                type="button"
                aria-label="Manage projects"
                onClick={() => router.push("/projects")}
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-active focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Plus className="size-3.5" />
              </button>
            }
          >
            {projects.map((project) => (
              <ProjectGroup
                key={project.id}
                project={project}
                activeSessionId={activeThread}
                onSelectSession={onSelectThread}
              />
            ))}
          </SidebarGroup>

          <SidebarGroup label="Recent">
            {sessions
              .filter((session) => !session.projectId && !session.archived)
              .map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  active={activeThread === session.id}
                  onNavigate={() => onSelectThread(session.id)}
                />
              ))}
          </SidebarGroup>
        </LayoutGroup>
      </div>
      <div className="mt-auto shrink-0 border-border border-t pt-3">
        <ProfileMenu />
      </div>
    </div>
  );
}

function SidebarGroup({
  label,
  children,
  action,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout={reduce ? false : "position"}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="mt-5"
    >
      <div className="flex items-center justify-between pr-1">
        <p className="px-3 pb-1.5 font-medium text-[10px] text-faint uppercase tracking-[0.12em]">
          {label}
        </p>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </motion.div>
  );
}

export function MobileSidebar({
  mode,
  onModeChange,
  open,
  onClose,
  activeThread,
  onNewChat,
  onSelectThread,
  onSearch,
}: {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  open: boolean;
  onClose: () => void;
  activeThread: string | null;
  onNewChat: () => void;
  onSelectThread: (thread: string) => void;
  onSearch: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open ? (
        <Dialog
          open
          onClose={onClose}
          aria-label="Workspace navigation"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <motion.button
            type="button"
            aria-label="Close navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65"
          />
          <DialogPanel
            className="relative h-full w-[min(85vw,17rem)]"
            aria-label="Workspace navigation"
          >
            <motion.aside
              aria-label="Workspace navigation"
              initial={reduce ? false : { x: -280 }}
              animate={{ x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: -280 }}
              transition={SPRING_PANEL}
              className="relative h-full w-[min(85vw,17rem)] border-border border-r bg-surface"
            >
              <SidebarContent
                mode={mode}
                onModeChange={onModeChange}
                activeThread={activeThread}
                onNewChat={onNewChat}
                onSelectThread={onSelectThread}
                onSearch={onSearch}
                onCollapse={onClose}
              />
            </motion.aside>
          </DialogPanel>
        </Dialog>
      ) : null}
    </AnimatePresence>
  );
}
