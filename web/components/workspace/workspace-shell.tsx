"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { Menu, PanelLeft } from "@/components/icons";
import { EASE_DRAWER } from "@/lib/ease";
import { SidebarContent, MobileSidebar } from "./sidebar";
import { SearchPalette } from "./search-palette";
import { useSessions } from "./session-provider";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const params = useParams<{ sessionId?: string }>();
  const { mode, setMode, storageError } = useSessions();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);
  function navigate(path: string) {
    router.push(path);
    setMobileSidebarOpen(false);
  }
  const sidebarProps = {
    mode,
    onModeChange: setMode,
    activeThread: params.sessionId ?? null,
    onNewChat: () => navigate("/"),
    onSelectThread: (id: string) => navigate(`/chat/${id}`),
    onSearch: () => {
      setMobileSidebarOpen(false);
      setSearchOpen(true);
    },
  };
  return (
    <main className="flex h-dvh overflow-hidden bg-background text-foreground">
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 248 : 0 }}
        transition={{ duration: reduce ? 0 : 0.28, ease: EASE_DRAWER }}
        inert={!sidebarOpen}
        aria-hidden={!sidebarOpen}
        className="hidden shrink-0 overflow-hidden bg-surface lg:block"
      >
        <motion.div
          initial={false}
          animate={{ x: sidebarOpen ? 0 : -248 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: EASE_DRAWER }}
          className="h-full w-[248px] border-r border-border"
        >
          <SidebarContent
            {...sidebarProps}
            onCollapse={() => setSidebarOpen(false)}
          />
        </motion.div>
      </motion.aside>
      <section className="relative flex min-w-0 flex-1 flex-col bg-background">
        <div className="absolute top-3 left-3 z-20 flex gap-1">
          <button
            type="button"
            aria-label={t("openNavigation")}
            onClick={() => setMobileSidebarOpen(true)}
            className="grid size-10 place-items-center rounded-lg bg-background text-muted-foreground hover:bg-surface-active focus-visible:outline-2 focus-visible:outline-primary lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          {!sidebarOpen ? (
            <button
              type="button"
              aria-label={t("expandSidebar")}
              onClick={() => setSidebarOpen(true)}
              className="hidden size-10 place-items-center rounded-lg bg-background text-muted-foreground hover:bg-surface-active focus-visible:outline-2 focus-visible:outline-primary lg:grid"
            >
              <PanelLeft className="size-[18px]" />
            </button>
          ) : null}
        </div>
        {storageError ? (
          <p role="status" className="px-16 py-2 text-xs text-muted-foreground">
            {t("storageUnavailable")}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
      <MobileSidebar
        {...sidebarProps}
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectThread={sidebarProps.onSelectThread}
      />
    </main>
  );
}
