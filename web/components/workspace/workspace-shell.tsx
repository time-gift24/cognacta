"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { WorkspaceSidebar } from "./sidebar";
import { SearchPalette } from "./search-palette";
import { useSessions } from "./session-provider";

export function WorkspaceShell({
  children,
  initialRail = false,
}: {
  children: ReactNode;
  initialRail?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Nav");
  const { storageError } = useSessions();
  const isChatSurface = pathname === "/" || pathname.startsWith("/chat/");
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <main className="workspace-surface flex h-dvh overflow-hidden text-foreground">
      <WorkspaceSidebar
        defaultCollapsed={initialRail}
        onSearchAll={() => setSearchOpen(true)}
      />
      <section className="relative flex min-w-0 flex-1 flex-col bg-transparent">
        {storageError ? (
          <p
            role="status"
            className="px-5 pt-14 pb-1 text-xs text-muted-foreground min-[640px]:pt-3"
          >
            {t("storageUnavailable")}
          </p>
        ) : null}
        <div
          className={`min-h-0 flex-1 overflow-y-auto ${
            isChatSurface ? "pt-14 min-[640px]:pt-0" : ""
          }`}
        >
          {children}
        </div>
      </section>
      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectThread={(id) => {
          setSearchOpen(false);
          router.push(`/chat/${id}`);
        }}
      />
    </main>
  );
}
