"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  AnimatePresence,
  LayoutGroup,
  Reorder,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Archive, BookOpen, LayoutGrid, Plus, X } from "@/components/icons";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Button } from "@/components/arc/button/button";
import { SearchField } from "@/components/arc/search-field/search-field";
import { TextMorph } from "@/components/arc/text-morph/text-morph";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { useTheme } from "@/components/theme-provider";
import { useSessions } from "./session-provider";
import { usePinnedSessions } from "./use-pinned-sessions";
import { formatBytes, useStorageUsage } from "./use-storage-usage";
import {
  NewProjectComposer,
  PanelGlyph,
  PinnedRow,
  ProjectRow,
  SectionTitle,
  NavRow,
  SessionRow,
  RailTip,
} from "./sidebar-rows";
import { ProfileMenu, WorkspaceMenu } from "./sidebar-menu";
import type { Mode, Session } from "./types";
import styles from "./sidebar.module.css";

const PHONE = "(max-width: 639px)";
const RAIL = 64;
const focusable =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const subscribeNothing = () => () => {};

/** Reduced motion is only known in the browser; the server render must match the first client render. */
function useReducedMotionSafe() {
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  return !!useReducedMotion() && hydrated;
}

/** Phones get an off-canvas sheet instead of a column beside the content. */
const subscribePhone = (change: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};
function usePhone() {
  return useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

/**
 * The width follows one value from 0 (rail) to 1 (open) on the smooth spring,
 * so the content beside the sidebar reflows every frame instead of jumping.
 */
function useRailWidth(rail: boolean, reduce: boolean, onOpened: () => void) {
  const open = useMotionValue(rail ? 0 : 1);
  const width = useTransform(
    open,
    (value) => `calc(${RAIL}px + (var(--full) - ${RAIL}px) * ${value})`,
  );
  const opened = useRef(onOpened);
  opened.current = onOpened;
  useEffect(() => {
    const target = rail ? 0 : 1;
    if (reduce) {
      open.jump(target);
      if (!rail) opened.current();
      return;
    }
    const controls = animate(open, target, {
      ...motionTokens.spring.smooth,
      onComplete: () => {
        if (!rail) opened.current();
      },
    });
    return () => controls.stop();
  }, [rail, reduce, open]);
  return width;
}

const instant = { duration: 0 } as const;

/** Locks the page behind the open drawer, keeping the scrollbar's room. */
function usePageLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const previous = {
      overflow: root.style.overflow,
      gutter: root.style.scrollbarGutter,
    };
    if (root.scrollHeight > root.clientHeight)
      root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.gutter;
    };
  }, [locked]);
}

export function WorkspaceSidebar({
  defaultCollapsed = false,
  onCollapsedChange,
  onSearchAll,
}: {
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onSearchAll?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ sessionId?: string }>();
  const t = useTranslations("Nav");
  const tModes = useTranslations("Modes");
  const tSettings = useTranslations("Settings");
  const store = useSessions();
  const {
    sessions,
    projects,
    createProject,
    createProjectSession,
    storageError,
    mode,
    setMode,
  } = store;
  const { theme, setTheme } = useTheme();
  const pins = usePinnedSessions(sessions);
  const storage = useStorageUsage(sessions, projects, pins.ids);

  const reduce = useReducedMotionSafe();
  const phone = usePhone();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [shown, setShown] = useState(false);
  const [query, setQuery] = useState("");
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>(
    {},
  );
  const [announcement, setAnnouncement] = useState("");
  const rail = collapsed && !phone;

  const inlineNavId = useId();
  const drawerNavId = useId();
  const groupId = useId();
  const frame = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const searchClip = useRef<HTMLDivElement>(null);
  const closeTimer = useRef(0);
  const returnFocus = useRef(false);
  const backdropPress = useRef(false);

  const width = useRailWidth(rail, reduce, () => {
    const clip = searchClip.current;
    if (clip) {
      delete clip.dataset.frozen;
      clip.style.removeProperty("--search-width");
    }
  });

  // The drawer's offset and fade are motion values, so a finger can hold it
  // mid-slide and the backdrop dims with its position.
  const sheetX = useMotionValue(-4096);
  const sheetFade = useMotionValue(1);
  const travel = useRef(320);
  const release = useRef(0);
  const swipe = useRef<{
    id: number;
    x: number;
    y: number;
    time: number;
    axis: "x" | "y" | null;
    velocity: number;
  } | null>(null);
  const shade = useTransform(
    [sheetX, sheetFade],
    ([x, fade]: number[]) =>
      Math.min(1, Math.max(0, 1 + x / travel.current)) * fade,
  );

  usePageLock(phone && drawer);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // The sheet measures its own travel after mount, so a narrow phone or a
  // rotated viewport still throws it the full distance.
  useEffect(() => {
    const node = sheet.current;
    if (!shown || !node) return;
    travel.current = node.offsetLeft + node.offsetWidth + 12;
  }, [shown, drawer, sheetX]);
  useEffect(() => {
    if (!phone) {
      setDrawer(false);
      setShown(false);
    }
  }, [phone]);

  // One spring carries the drawer in and out from wherever it is, including
  // mid-swipe, so a reversal never restarts the slide.
  useEffect(() => {
    if (!shown) return;
    const settle = () => {
      if (!drawer) setShown(false);
    };
    if (reduce) {
      if (drawer) sheetX.jump(0);
      const fade = animate(sheetFade, drawer ? 1 : 0, {
        duration: motionTokens.duration.fast,
        ease: [...motionTokens.ease.standard],
        onComplete: () => {
          if (!drawer) sheetX.jump(-travel.current);
          settle();
        },
      });
      return () => fade.stop();
    }
    sheetFade.jump(1);
    const velocity = release.current;
    release.current = 0;
    const slide = animate(sheetX, drawer ? 0 : -travel.current, {
      ...motionTokens.spring.smooth,
      velocity,
      onComplete: settle,
    });
    return () => slide.stop();
  }, [drawer, shown, reduce, sheetX, sheetFade]);

  // Focus moves into the drawer once it can take it, and back to the opener
  // once the page behind is interactive again.
  useEffect(() => {
    if (drawer) {
      const frameId = requestAnimationFrame(() => {
        const current = sheet.current?.querySelector<HTMLElement>(
          "[aria-current='page']",
        );
        if (current && !current.closest("[inert]")) {
          current.focus({ preventScroll: true });
        } else {
          sheet.current?.focus({ preventScroll: true });
        }
      });
      return () => cancelAnimationFrame(frameId);
    }
    if (returnFocus.current) {
      returnFocus.current = false;
      opener.current?.focus({ preventScroll: true });
    }
  }, [drawer]);

  const navItems = [
    {
      key: "newChat",
      label: t("newChat"),
      href: "/",
      icon: Plus,
      shortcut: "⌘N",
    },
    {
      key: "knowledgeBase",
      label: t("knowledgeBase"),
      href: "/knowledge-base",
      icon: BookOpen,
    },
    {
      key: "connectedApps",
      label: t("connectedApps"),
      href: "/integrations",
      icon: LayoutGrid,
    },
    {
      key: "archivedChats",
      label: t("archivedChats"),
      href: "/archived",
      icon: Archive,
    },
  ] as const;

  const activeSessionId = params.sessionId ?? null;
  const activeNav =
    pathname === "/"
      ? "newChat"
      : pathname === "/knowledge-base"
        ? "knowledgeBase"
        : pathname === "/integrations"
          ? "connectedApps"
          : pathname === "/archived"
            ? "archivedChats"
            : null;

  useEffect(() => {
    if (!activeSessionId || pins.ids.includes(activeSessionId)) return;
    const project = projects.find((item) =>
      sessions.some(
        (session) =>
          session.id === activeSessionId && session.projectId === item.id,
      ),
    );
    if (!project) return;
    setOpenProjects((current) =>
      current[project.id] ? current : { ...current, [project.id]: true },
    );
  }, [activeSessionId, pins.ids, projects, sessions]);

  function announce(message: string) {
    setAnnouncement(message);
  }

  function setRail(next: boolean) {
    if (next === collapsed) return;
    const clip = searchClip.current;
    if (next && clip && !("frozen" in clip.dataset)) {
      clip.style.setProperty("--search-width", `${clip.clientWidth}px`);
      clip.dataset.frozen = "";
    }
    // Focus never stays behind in a part of the sidebar the rail hides.
    const active = document.activeElement;
    if (
      next &&
      active instanceof HTMLElement &&
      active.closest("[data-rail-hidden]") &&
      frame.current?.contains(active)
    ) {
      toggleRef.current?.focus();
    }
    setCollapsed(next);
    announce(next ? t("railCollapsed") : t("railExpanded"));
    onCollapsedChange?.(next);
    try {
      document.cookie = `cognacta.sidebar.rail=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // The preference is cosmetic; a blocked cookie must not break the rail.
    }
  }

  const newChat = useRef(() => {});
  newChat.current = () => selectNav("/");
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.shiftKey ||
        event.altKey ||
        event.repeat ||
        event.key.toLowerCase() !== "n" ||
        event.defaultPrevented
      )
        return;
      const target =
        event.target instanceof HTMLElement ? event.target : null;
      const dialog = target?.closest<HTMLElement>('[role="dialog"]');
      if (
        target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
          target.closest('[role="menu"]') ||
          (dialog && dialog !== sheet.current))
      )
        return;
      event.preventDefault();
      newChat.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openDrawer() {
    window.clearTimeout(closeTimer.current);
    const node = sheet.current;
    if (node) travel.current = node.offsetLeft + node.offsetWidth + 12;
    if (!shown) {
      sheetX.jump(-travel.current);
      sheetFade.jump(reduce ? 0 : 1);
    }
    setShown(true);
    setDrawer(true);
  }

  function closeDrawer(delay = 0) {
    window.clearTimeout(closeTimer.current);
    const close = () => {
      const active = document.activeElement;
      returnFocus.current =
        !active ||
        active === document.body ||
        !!sheet.current?.contains(active);
      setDrawer(false);
    };
    if (delay && !reduce) closeTimer.current = window.setTimeout(close, delay);
    else close();
  }

  const closeDrawerRef = useRef(closeDrawer);
  closeDrawerRef.current = closeDrawer;

  // A nested dialog can return focus to the page body when its trigger was a
  // menu item that no longer exists. Escape still closes the sheet from there;
  // an open menu or an above-sheet dialog keeps the key first.
  useEffect(() => {
    if (!drawer) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const nested = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].some(
        (element) =>
          element !== sheet.current &&
          element.getAttribute("aria-modal") === "true",
      );
      if (nested || document.querySelector('[role="menu"]')) return;
      event.preventDefault();
      closeDrawerRef.current();
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [drawer]);

  // [ toggles the rail, or the sheet on a phone. It stays out of text fields,
  // menus, and dialogs so typing is never hijacked.
  const toggleShortcut = useRef(() => {});
  toggleShortcut.current = () => {
    if (phone) {
      if (drawer) closeDrawer();
      else openDrawer();
      return;
    }
    setRail(!collapsed);
  };
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.key !== "[" ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.defaultPrevented
      )
        return;
      const target =
        event.target instanceof HTMLElement ? event.target : null;
      const dialog = target?.closest<HTMLElement>('[role="dialog"]');
      if (
        target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
          target.closest('[role="menu"]') ||
          (dialog && dialog !== sheet.current))
      )
        return;
      if (!window.matchMedia(PHONE).matches) {
        const box = frame.current?.getBoundingClientRect();
        if (!box?.width) return;
      }
      event.preventDefault();
      toggleShortcut.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function selectNav(href: string) {
    setQuery("");
    if (phone) closeDrawer(140);
    router.push(href);
  }

  function selectSession(session: Session) {
    setQuery("");
    if (phone) closeDrawer(140);
    router.push(`/chat/${session.id}`);
  }

  function newChatInProject(projectId: string) {
    const id = createProjectSession(projectId);
    if (!id) return;
    setQuery("");
    if (phone) closeDrawer(140);
    router.push(`/chat/${id}`);
  }

  function changeQuery(value: string) {
    setQuery(value);
    const text = value.trim().toLowerCase();
    if (!text) {
      announce(t("showingAll"));
      return;
    }
    const includes = (title: string) => title.toLowerCase().includes(text);
    let count =
      navItems.filter((item) => includes(item.label)).length +
      pins.pinned.filter((session) => includes(session.title)).length;
    for (const project of projects) {
      const all = sessions.filter(
        (session) =>
          session.projectId === project.id &&
          !session.archived &&
          !pins.pinnedIds.has(session.id),
      );
      const titleMatch = includes(project.title);
      const sessionMatches = all.filter((session) =>
        includes(session.title),
      );
      if (titleMatch) count += all.length + 1;
      else if (sessionMatches.length) count += sessionMatches.length + 1;
    }
    count += sessions.filter(
      (session) =>
        !session.projectId &&
        !session.archived &&
        !pins.pinnedIds.has(session.id) &&
        includes(session.title),
    ).length;
    announce(
      count === 0 ? t("searchNone") : t("searchResults", { count }),
    );
  }

  function togglePin(id: string) {
    const session = sessions.find((item) => item.id === id);
    if (!session) return;
    const wasPinned = pins.pinnedIds.has(id);
    pins.toggle(id);
    announce(
      wasPinned
        ? t("unpinnedNotice", { name: session.title })
        : t("pinnedNotice", { name: session.title }),
    );
    if (!wasPinned) {
      requestAnimationFrame(() => {
        const root = phone ? sheet.current : frame.current;
        root
          ?.querySelector<HTMLElement>(
            `[data-pin-id="${CSS.escape(id)}"]`,
          )
          ?.focus({ preventScroll: true });
      });
    }
  }

  function movePin(id: string, direction: -1 | 1) {
    const index = pins.pinned.findIndex((session) => session.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= pins.pinned.length) return;
    const copy = [...pins.pinned];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    pins.reorder(copy.map((session) => session.id));
    announce(
      t("pinnedMoved", {
        name: copy[next].title,
        index: next + 1,
        total: copy.length,
      }),
    );
    requestAnimationFrame(() => {
      const root = phone ? sheet.current : frame.current;
      root
        ?.querySelector<HTMLElement>(`[data-pin-id="${CSS.escape(id)}"]`)
        ?.focus({ preventScroll: true });
    });
  }

  function createNewProject(name: string) {
    const id = createProject(name);
    if (!id) return;
    setOpenProjects((current) => ({ ...current, [id]: true }));
    announce(t("projectCreated", { name }));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const root = phone ? sheet.current : frame.current;
        root
          ?.querySelector<HTMLElement>(
            `[data-project-id="${CSS.escape(id)}"]`,
          )
          ?.focus({ preventScroll: true });
      }),
    );
  }

  function searchFirstResult() {
    const text = query.trim().toLowerCase();
    if (!text) return;
    const nav = navItems.find((item) =>
      item.label.toLowerCase().includes(text),
    );
    if (nav) return selectNav(nav.href);
    const pinned = pins.pinned.find((session) =>
      session.title.toLowerCase().includes(text),
    );
    if (pinned) return selectSession(pinned);
    const projectSession = projects
      .flatMap((project) =>
        sessions.filter(
          (session) =>
            session.projectId === project.id &&
            !session.archived &&
            session.title.toLowerCase().includes(text),
        ),
      )[0];
    if (projectSession) return selectSession(projectSession);
    const recent = sessions.find(
      (session) =>
        !session.projectId &&
        !session.archived &&
        session.title.toLowerCase().includes(text),
    );
    if (recent) return selectSession(recent);
  }

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && query.trim()) {
      event.preventDefault();
      searchFirstResult();
    } else if (event.key === "Escape" && query) {
      event.preventDefault();
      changeQuery("");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      requestAnimationFrame(() => {
        const root = phone ? sheet.current : frame.current;
        const first = root?.querySelector<HTMLElement>("[data-row]");
        first?.focus({ preventScroll: true });
      });
    }
  }

  function changeTheme(next: typeof theme) {
    setTheme(next);
    announce(
      t("themeChanged", {
        theme:
          next === "dark"
            ? tSettings("dark")
            : next === "light"
              ? tSettings("light")
              : tSettings("system"),
      }),
    );
  }

  function changeMode(next: Mode) {
    setMode(next);
    announce(t("modeChanged", { mode: tModes(next) }));
  }

  const q = query.trim();
  const includes = (title: string) =>
    title.toLowerCase().includes(q.toLowerCase());
  const navMatches = navItems.filter((item) => !q || includes(item.label));
  const pinnedMatches = pins.pinned.filter(
    (session) => !q || includes(session.title),
  );
  const pinnedIds = pins.pinnedIds;
  const projectRows = projects
    .map((project, index) => {
      const all = sessions.filter(
        (session) =>
          session.projectId === project.id &&
          !session.archived &&
          !pinnedIds.has(session.id),
      );
      const titleMatch = !q || includes(project.title);
      const sessionMatches = q
        ? all.filter((session) => includes(session.title))
        : all;
      return {
        project,
        index,
        sessions: titleMatch ? all : sessionMatches,
        held: all.some((session) => session.id === activeSessionId),
        visible: !q || titleMatch || sessionMatches.length > 0,
        expanded: q
          ? titleMatch || sessionMatches.length > 0
          : !!openProjects[project.id],
      };
    })
    .filter((row) => row.visible);
  const recent = sessions.filter(
    (session) =>
      !session.projectId && !session.archived && !pinnedIds.has(session.id),
  );
  const recentMatches = q
    ? recent.filter((session) => includes(session.title))
    : recent;
  const totalResults =
    navMatches.length +
    pinnedMatches.length +
    projectRows.reduce((count, row) => count + row.sessions.length + 1, 0) +
    recentMatches.length;
  const empty = !!q && totalResults === 0;
  const tones = ["green", "blue", "violet", "amber", "coral", "slate"];

  function renderNav(placement: "inline" | "drawer") {
    const sheetMode = placement === "drawer";
    const scope = `${groupId}-${placement}`;
    return (
      <TooltipPrimitive.Provider delayDuration={250} skipDelayDuration={300}>
        <LayoutGroup id={`${groupId}-${placement}`}>
          <motion.nav
            ref={sheetMode ? undefined : frame}
            id={sheetMode ? drawerNavId : inlineNavId}
            className={styles.sidebar}
            style={sheetMode ? undefined : { width }}
            data-rail={rail || undefined}
            data-placement={placement}
            aria-label={t("workspaceNavigation")}
          >
            <div className={styles.header}>
              <WorkspaceMenu
                rail={rail}
                mode={mode}
                theme={theme}
                onModeChange={changeMode}
                onThemeChange={changeTheme}
                onSearchAll={() => {
                  if (phone) closeDrawer();
                  onSearchAll?.();
                }}
                onManageProjects={() => selectNav("/projects")}
                onSettings={() => selectNav("/settings")}
                onHelp={() => selectNav("/help")}
              />
              <div className={styles.searchRow}>
                <div
                  ref={sheetMode ? undefined : searchClip}
                  className={styles.searchClip}
                  data-rail-hidden=""
                  inert={rail}
                >
                  <div className={styles.search}>
                    <SearchField
                      label={t("searchLabel")}
                      placeholder={t("searchPlaceholder")}
                      clearLabel={t("clearSearch")}
                      value={query}
                      onValueChange={changeQuery}
                      onKeyDown={onSearchKeyDown}
                    />
                  </div>
                </div>
                {sheetMode ? (
                  <button
                    type="button"
                    className={styles.toggle}
                    aria-label={t("closeNavigation")}
                    onClick={() => closeDrawer()}
                  >
                    <X className="size-[18px]" />
                  </button>
                ) : (
                  <RailTipToggle
                    collapsed={collapsed}
                    rail={rail}
                    reduce={reduce}
                    controls={inlineNavId}
                    onToggle={() => setRail(!collapsed)}
                    buttonRef={toggleRef}
                  />
                )}
              </div>
            </div>

            <motion.div className={styles.scroll} layoutScroll>
              <div className={styles.stack}>
                <p id={`${scope}-pin-hint`} className="sr-only">
                  {t("reorderHint")}
                </p>
                {navMatches.length > 0 ? (
                  <section
                    className={styles.section}
                    aria-labelledby={`${scope}-work`}
                  >
                    <SectionTitle
                      id={`${scope}-work`}
                      text={t("workspace")}
                      count={q ? navMatches.length : undefined}
                      rail={rail}
                      reduce={reduce}
                    />
                    <ul className={styles.list}>
                      {navMatches.map((item) => (
                        <li key={item.key}>
                          <NavRow
                            label={item.label}
                            icon={item.icon}
                            active={activeNav === item.key}
                            shortcut={
                              "shortcut" in item ? item.shortcut : undefined
                            }
                            keyshortcuts={
                              item.key === "newChat" ? "Meta+N Control+N" : undefined
                            }
                            rail={rail}
                            query={q}
                            reduce={reduce}
                            onClick={() => selectNav(item.href)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {pinnedMatches.length > 0 ? (
                  <section
                    className={styles.section}
                    aria-labelledby={`${scope}-pinned`}
                  >
                    <SectionTitle
                      id={`${scope}-pinned`}
                      text={t("pinned")}
                      count={q ? pinnedMatches.length : pins.pinned.length}
                      rail={rail}
                      reduce={reduce}
                    />
                    <Reorder.Group
                      as="ul"
                      axis="y"
                      values={pinnedMatches}
                      onReorder={(next) => {
                        if (q) return;
                        pins.reorder(next.map((session) => session.id));
                      }}
                      className={styles.list}
                    >
                      <AnimatePresence initial={false}>
                        {pinnedMatches.map((session) => (
                          <PinnedRow
                            key={session.id}
                            session={session}
                            active={session.id === activeSessionId}
                            query={q}
                            rail={rail}
                            reduce={reduce}
                            draggable={!q}
                            pinned
                            hintId={`${scope}-pin-hint`}
                            onTogglePin={() => togglePin(session.id)}
                            onSelect={() => selectSession(session)}
                            onMove={(direction) =>
                              movePin(session.id, direction)
                            }
                            onDropped={() => {
                              if (!q) announce(t("pinnedOrderSaved"));
                            }}
                          />
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  </section>
                ) : null}

                {!q || projectRows.length > 0 ? (
                  <section
                    className={styles.section}
                    aria-labelledby={`${scope}-projects`}
                  >
                    <SectionTitle
                      id={`${scope}-projects`}
                      text={t("projects")}
                      count={q ? projectRows.length : projects.length}
                      rail={rail}
                      reduce={reduce}
                    />
                    <ul className={styles.list}>
                      {projectRows.map((row) => (
                        <ProjectRow
                          key={row.project.id}
                          project={row.project}
                          sessions={row.sessions}
                          tone={tones[row.index % tones.length]}
                          expanded={row.expanded}
                          held={row.held}
                          query={q}
                          rail={rail}
                          reduce={reduce}
                          activeId={activeSessionId}
                          pinnedIds={pinnedIds}
                          onTogglePin={togglePin}
                          onSelectSession={selectSession}
                          onNewChat={() => newChatInProject(row.project.id)}
                          onToggle={() => {
                            if (rail) {
                              setRail(false);
                              setOpenProjects((current) => ({
                                ...current,
                                [row.project.id]: true,
                              }));
                              return;
                            }
                            setOpenProjects((current) => ({
                              ...current,
                              [row.project.id]: !current[row.project.id],
                            }));
                          }}
                        />
                      ))}
                    </ul>
                    {!q ? (
                      <NewProjectComposer
                        rail={rail}
                        reduce={reduce}
                        onExpand={() => setRail(false)}
                        taken={(name) =>
                          projects.find(
                            (project) =>
                              project.title.toLowerCase() ===
                              name.toLowerCase(),
                          )?.title
                        }
                        onCreate={createNewProject}
                      />
                    ) : null}
                  </section>
                ) : null}

                {recentMatches.length > 0 ? (
                  <section
                    className={styles.section}
                    aria-labelledby={`${scope}-recent`}
                  >
                    <SectionTitle
                      id={`${scope}-recent`}
                      text={t("recent")}
                      count={recentMatches.length}
                      rail={rail}
                      reduce={reduce}
                    />
                    <ul className={styles.list}>
                      <AnimatePresence initial={false}>
                        {recentMatches.map((session) => (
                          <li key={session.id} className={styles.item}>
                            <SessionRow
                              session={session}
                              active={session.id === activeSessionId}
                              query={q}
                              rail={rail}
                              reduce={reduce}
                              pinned={pins.pinnedIds.has(session.id)}
                              onTogglePin={() => togglePin(session.id)}
                              onSelect={() => selectSession(session)}
                            />
                          </li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </section>
                ) : null}

                {empty ? (
                  <div className={styles.empty}>
                    <div className={styles.emptyBody}>
                      <p>
                        {t("searchNone")} “{query.trim()}”
                      </p>
                      <span>{t("searchNoneHint")}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => changeQuery("")}
                      >
                        {t("showAll")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>

            <div className={styles.footer}>
              <motion.div
                className={styles.storageFold}
                data-rail-hidden=""
                inert={rail}
                initial={false}
                animate={{ height: rail ? 0 : "auto" }}
                transition={reduce ? instant : motionTokens.spring.smooth}
              >
                {storage.unavailable || storageError ? (
                  <div className={styles.storageError}>
                    {t("storageUnavailableShort")}
                    <span>{t("storageUnavailable")}</span>
                  </div>
                ) : (
                  <div
                    className={styles.storage}
                    data-full={storage.percent >= 90 ? "" : undefined}
                  >
                    <div className={styles.storageHead}>
                      <TextMorph as="span" className={styles.storageLabel}>
                        {storage.percent >= 90
                          ? t("storageAlmostFull")
                          : t("storage")}
                      </TextMorph>
                      <AnimatedCounter
                        className={styles.percent}
                        value={storage.percent}
                        decimals={storage.percent < 10 ? 1 : 0}
                        suffix="%"
                        locale="en-US"
                      />
                    </div>
                    <div
                      className={styles.track}
                      role="meter"
                      aria-label={t("storage")}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(storage.percent)}
                      aria-valuetext={`${Math.round(storage.percent)}%, ${formatBytes(storage.bytes)} / ${formatBytes(storage.limit)}`}
                    >
                      <motion.span
                        className={styles.fill}
                        initial={false}
                        animate={{ scaleX: storage.percent / 100 }}
                        transition={
                          reduce ? instant : motionTokens.spring.smooth
                        }
                      />
                    </div>
                    <span className={styles.storageDetail}>
                      {formatBytes(storage.bytes)} /{" "}
                      {formatBytes(storage.limit)}
                    </span>
                  </div>
                )}
              </motion.div>
              <ProfileMenu
                rail={rail}
                onSettings={() => selectNav("/settings")}
                onManageProjects={() => selectNav("/projects")}
                onHelp={() => selectNav("/help")}
              />
            </div>

            <p className="sr-only" role="status" aria-live="polite">
              {announcement}
            </p>
          </motion.nav>
        </LayoutGroup>
      </TooltipPrimitive.Provider>
    );
  }

  /** A horizontal swipe toward the edge drags the drawer with the finger; a
   *  flick or a pull past a third closes it, anything less springs back. */
  function onSheetPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || !drawer || swipe.current) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("input, textarea, [data-lifted], [data-no-drag]"))
      return;
    swipe.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
      axis: null,
      velocity: 0,
    };
  }
  function onSheetPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = swipe.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      gesture.axis =
        Math.abs(dx) > Math.abs(dy) * 1.2 &&
        !sheet.current?.querySelector("[data-lifted]")
          ? "x"
          : "y";
      if (gesture.axis === "x") {
        gesture.x = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
    if (gesture.axis !== "x") return;
    const offset = event.clientX - gesture.x;
    const next = offset > 0 ? 10 * (1 - Math.exp(-offset / 60)) : offset;
    const elapsed = Math.max(1, event.timeStamp - gesture.time);
    gesture.velocity = ((next - sheetX.get()) / elapsed) * 1000;
    gesture.time = event.timeStamp;
    sheetX.jump(next);
  }
  function onSheetPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = swipe.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    swipe.current = null;
    if (gesture.axis !== "x") return;
    const x = sheetX.get();
    const close =
      event.type !== "pointercancel" &&
      (x < -travel.current / 3 || gesture.velocity < -500);
    if (!close) {
      animate(
        sheetX,
        0,
        reduce
          ? instant
          : { ...motionTokens.spring.smooth, velocity: gesture.velocity },
      );
      return;
    }
    release.current = gesture.velocity;
    closeDrawer();
  }

  /** The drawer is a modal layer: Tab stays inside it and Escape closes it,
   *  unless a menu or field inside handled the key first. */
  function onSheetKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null;
    if (
      event.defaultPrevented ||
      !sheet.current ||
      !target ||
      !sheet.current.contains(target)
    )
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [
      ...sheet.current.querySelectorAll<HTMLElement>(focusable),
    ].filter(
      (item) => !item.closest("[inert]") && item.getClientRects().length > 0,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === sheet.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <motion.aside
        className={styles.inline}
      >
        {renderNav("inline")}
      </motion.aside>

      <Tooltip
        content={
          <span className="flex items-center gap-2">
            {t("openNavigation")}
            <kbd className="rounded border border-background/30 px-1 font-mono text-[10px]">
              [
            </kbd>
          </span>
        }
        side="bottom"
      >
        <button
          ref={opener}
          type="button"
          className={styles.opener}
          aria-label={t("openNavigation")}
          aria-expanded={drawer}
          aria-controls={drawerNavId}
          aria-keyshortcuts="["
          onClick={openDrawer}
        >
          <PanelGlyph collapsed reduce={reduce} />
        </button>
      </Tooltip>

      {shown && typeof document !== "undefined"
        ? createPortal(
            <>
              <motion.div
                className={styles.backdrop}
                data-open={drawer ? "" : undefined}
                style={{ opacity: shade }}
                aria-hidden="true"
                onPointerDown={() => {
                  backdropPress.current = true;
                }}
                onClick={() => {
                  if (backdropPress.current) closeDrawer();
                  backdropPress.current = false;
                }}
              />
              <motion.div
                ref={sheet}
                className={styles.sheet}
                data-shown={shown ? "" : undefined}
                role="dialog"
                aria-modal="true"
                aria-label={t("workspaceNavigation")}
                tabIndex={-1}
                inert={!drawer}
                onKeyDown={onSheetKeyDown}
                style={{ x: sheetX, opacity: sheetFade }}
                onPointerDown={onSheetPointerDown}
                onPointerMove={onSheetPointerMove}
                onPointerUp={onSheetPointerEnd}
                onPointerCancel={onSheetPointerEnd}
              >
                {renderNav("drawer")}
              </motion.div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}

/** The toggle rides the sidebar's edge, so it settles on the rail's icon axis. */
function RailTipToggle({
  collapsed,
  rail,
  reduce,
  controls,
  onToggle,
  buttonRef,
}: {
  collapsed: boolean;
  rail: boolean;
  reduce: boolean;
  controls?: string;
  onToggle: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations("Nav");
  return (
    <RailTip
      enabled={rail}
      label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
      shortcut="["
      side={collapsed ? "right" : "bottom"}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
        aria-expanded={!collapsed}
        aria-controls={controls}
        aria-keyshortcuts="["
        onClick={onToggle}
      >
        <PanelGlyph collapsed={collapsed} reduce={reduce} />
      </button>
    </RailTip>
  );
}

export default WorkspaceSidebar;
