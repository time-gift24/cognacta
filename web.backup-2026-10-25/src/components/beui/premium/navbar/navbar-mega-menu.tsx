"use client";

import {
  ArrowUpRight,
  ChevronDown,
  Layers3,
  Menu,
  Play,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type MegaMenuLink = { label: string; href: string; external?: boolean };
export type MegaMenuItem = {
  id: string;
  label: string;
  href?: string;
  groups?: { title: string; links: MegaMenuLink[] }[];
  featured?: MegaMenuLink & { description: string };
};
export type NavbarMegaMenuProps = {
  brand?: string;
  brandHref?: string;
  items?: MegaMenuItem[];
  cta?: MegaMenuLink;
  signIn?: MegaMenuLink;
  signUp?: MegaMenuLink;
  layout?: "full-width" | "pill-groups";
  className?: string;
};
const defaultItems: MegaMenuItem[] = [
  {
    id: "product",
    label: "Product",
    groups: [
      {
        title: "Create together",
        links: [
          { label: "Shared workspaces", href: "#workspaces" },
          { label: "Project planning", href: "#planning" },
          { label: "Document library", href: "#documents" },
          { label: "Team collaboration", href: "#teams" },
        ],
      },
      {
        title: "Keep things moving",
        links: [
          { label: "Automations", href: "#automations" },
          { label: "Approvals", href: "#approvals" },
          { label: "Reports & insights", href: "#reports" },
          { label: "Integrations", href: "#integrations" },
        ],
      },
      {
        title: "Built for your team",
        links: [
          { label: "Design teams", href: "#design" },
          { label: "Operations", href: "#operations" },
          { label: "Growing companies", href: "#companies" },
          { label: "Enterprise", href: "#enterprise" },
        ],
      },
    ],
    featured: {
      label: "Meet your new workspace",
      description: "Take a closer look at a calmer way to work.",
      href: "#tour",
    },
  },
  {
    id: "resources",
    label: "Resources",
    groups: [
      {
        title: "Explore & learn",
        links: [
          { label: "Customer stories", href: "#stories" },
          { label: "Guides & playbooks", href: "#guides" },
          { label: "What’s new", href: "#updates" },
          { label: "From the journal", href: "#journal" },
          { label: "Community", href: "#community" },
        ],
      },
      {
        title: "Make it your own",
        links: [
          { label: "Template library", href: "#templates" },
          { label: "Connected tools", href: "#tools" },
          { label: "Import your work", href: "#import" },
          { label: "Partner directory", href: "#partners" },
        ],
      },
      {
        title: "For builders",
        links: [
          { label: "Documentation", href: "#docs" },
          { label: "API reference", href: "#api" },
          { label: "Webhooks", href: "#webhooks" },
          { label: "System status", href: "#status" },
        ],
      },
    ],
    featured: {
      label: "A good place to start",
      description: "Short walkthroughs. Useful ideas. Your own pace.",
      href: "#tutorials",
    },
  },
  { id: "pricing", label: "Pricing", href: "#pricing" },
  { id: "download", label: "Download", href: "#download" },
];
const externalProps = (link: MegaMenuLink) =>
  link.external ? { target: "_blank", rel: "noreferrer noopener" } : {};
export function NavbarMegaMenu({
  brand = "Forma",
  brandHref = "/",
  items = defaultItems,
  cta = { label: "Book a demo", href: "#demo" },
  signIn = { label: "Log in", href: "#login" },
  signUp,
  layout = "full-width",
  className,
}: NavbarMegaMenuProps) {
  const [active, setActive] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const root = useRef<HTMLElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const reduce = useReducedMotion();
  const hover = useHoverCapable();
  const current = items.find((item) => item.id === active && item.groups);
  const [lastMenu, setLastMenu] = useState(() =>
    items.find((item) => item.groups),
  );
  const shownMenu = current ?? lastMenu;
  const desktopOpen = !!current && !mobile;
  const contentRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const [navigationWidth, setNavigationWidth] = useState(0);
  const [pillBounds, setPillBounds] = useState({ top: 12, height: 52 });
  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation || layout !== "pill-groups") return;
    const measure = () => {
      const bounds = navigation.getBoundingClientRect();
      setNavigationWidth(bounds.width);
      setPillBounds({
        top: bounds.top - (root.current?.getBoundingClientRect().top ?? 0),
        height: bounds.height,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(navigation);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [layout]);
  const [panelHeight, setPanelHeight] = useState(0);
  useEffect(() => {
    if (current) setLastMenu(current);
  }, [current]);
  useLayoutEffect(() => {
    if (!shownMenu) return;
    const content = contentRef.current;
    if (!content) return;
    const measure = () =>
      setPanelHeight(content.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [shownMenu]);
  const revealText = (delay: number) => ({
    initial:
      reduce || layout === "full-width"
        ? (false as const)
        : { opacity: 0, transform: "translateY(8px)" },
    animate: {
      opacity: layout === "full-width" || desktopOpen ? 1 : 0,
      transform:
        layout === "full-width" || desktopOpen || reduce
          ? "translateY(0px)"
          : "translateY(8px)",
    },
    transition: {
      duration: reduce ? 0 : desktopOpen ? 0.2 : 0.1,
      delay:
        reduce || !desktopOpen
          ? 0
          : layout === "pill-groups"
            ? Math.min(delay * 0.3, 0.055)
            : delay,
      ease: EASE_OUT,
    },
  });
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const close = () => {
    cancel();
    setActive(null);
    setMobile(false);
  };
  const open = (value: string | null) => {
    cancel();
    setActive(value);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!active && !mobile) return;
    const dismiss = (event: Event) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setActive(null);
        setMobile(false);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mobile) mobileTrigger.current?.focus();
        else if (active) triggers.current.get(active)?.focus();
        else mobileTrigger.current?.focus();
        setActive(null);
        setMobile(false);
      }
    };
    const media = window.matchMedia(
      layout === "pill-groups" ? "(min-width: 1024px)" : "(min-width: 768px)",
    );
    const resize = () => {
      setActive(null);
      setMobile(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", key);
    media.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("keydown", key);
      media.removeEventListener("change", resize);
    };
  }, [active, mobile, layout]);
  return (
    <>
      <AnimatePresence>
        {layout === "full-width" && desktopOpen && (
          <Button
            variant="plain"
            key="navigation-backdrop"
            type="button"
            aria-label="Close navigation menu"
            tabIndex={-1}
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
            className="fixed inset-0 z-30 hidden cursor-default bg-foreground/15 backdrop-blur-sm md:block"
          />
        )}
      </AnimatePresence>
      <header
        ref={root}
        onPointerEnter={cancel}
        onPointerLeave={(event) => {
          if (!mobile && hover && event.pointerType === "mouse") {
            cancel();
            timer.current = setTimeout(
              () => setActive(null),
              layout === "pill-groups" ? 80 : 140,
            );
          }
        }}
        className={cn(
          "relative z-40 w-full bg-background text-foreground",
          layout === "full-width" && "border-b border-border",
          className,
        )}
      >
        {layout === "pill-groups" && (
          <motion.div
            aria-hidden
            initial={false}
            animate={{
              height: pillBounds.height + (desktopOpen ? panelHeight : 0),
            }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE_OUT }}
            style={{ top: pillBounds.top, width: navigationWidth }}
            className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 rounded-3xl border border-border bg-background lg:block"
          />
        )}
        <nav
          aria-label="Primary navigation"
          className={cn(
            "mx-auto flex min-h-16 flex-wrap items-center gap-x-7 px-5 sm:px-8",
            layout === "pill-groups"
              ? "max-w-screen-2xl py-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4"
              : "max-w-7xl",
          )}
        >
          <a
            href={brandHref}
            className="flex items-center gap-2 rounded-full py-3 text-xl font-medium tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Layers3 aria-hidden className="size-6" />
            {brand}
          </a>
          <div className="ml-auto md:order-3">
            <div
              className={cn(
                "hidden items-center whitespace-nowrap",
                layout === "pill-groups" ? "lg:flex" : "md:flex",
                layout === "pill-groups"
                  ? "gap-1 rounded-full bg-muted/60 p-1.5"
                  : "gap-4",
              )}
            >
              <a
                href={signIn.href}
                {...externalProps(signIn)}
                className="rounded-full px-2 py-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {signIn.label}
              </a>
              {signUp && (
                <a
                  href={signUp.href}
                  {...externalProps(signUp)}
                  className="rounded-full px-3 py-2 text-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {signUp.label}
                </a>
              )}
              <ButtonLink href={cta.href} {...externalProps(cta)}>
                {cta.label}
              </ButtonLink>
            </div>
            <Button
              ref={mobileTrigger}
              variant="ghost"
              className={cn(
                "size-10 p-0",
                layout === "pill-groups" ? "lg:hidden" : "md:hidden",
              )}
              aria-label={mobile ? "Close navigation" : "Open navigation"}
              aria-expanded={mobile}
              aria-controls={`${id}-mobile`}
              onClick={() => {
                setMobile(!mobile);
                setActive(null);
              }}
            >
              {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
          <div
            ref={navigationRef}
            id={`${id}-links`}
            className={cn(
              "relative order-2 hidden items-center gap-1 whitespace-nowrap",
              layout === "pill-groups" ? "lg:flex" : "md:flex",
              layout === "pill-groups" && "rounded-full p-1.5",
            )}
          >
            {items.map((item) =>
              item.groups ? (
                <Button
                  variant="plain"
                  key={item.id}
                  ref={(node) => {
                    if (node) triggers.current.set(item.id, node);
                    else triggers.current.delete(item.id);
                  }}
                  type="button"
                  aria-expanded={active === item.id}
                  aria-controls={`${id}-panel`}
                  onPointerEnter={(event) => {
                    if (hover && event.pointerType === "mouse") open(item.id);
                  }}
                  onClick={() => open(active === item.id ? null : item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      open(item.id);
                      requestAnimationFrame(() =>
                        document
                          .getElementById(`${id}-panel`)
                          ?.querySelector<HTMLAnchorElement>("a")
                          ?.focus(),
                      );
                    }
                  }}
                  className={cn(
                    "flex min-h-10 items-center justify-between gap-1.5 rounded-full px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active === item.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  <motion.span
                    aria-hidden
                    animate={{ rotate: active === item.id ? 180 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                  >
                    <ChevronDown className="size-3.5" />
                  </motion.span>
                </Button>
              ) : (
                <a
                  key={item.id}
                  href={item.href}
                  onPointerEnter={(event) => {
                    if (hover && event.pointerType === "mouse") open(null);
                  }}
                  onClick={close}
                  className="flex min-h-10 items-center rounded-full px-3 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </a>
              ),
            )}
          </div>
        </nav>
        {mobile && (
          <motion.div
            id={`${id}-mobile`}
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
            className={cn(
              "absolute inset-x-0 top-full z-50 max-h-[70dvh] overflow-y-auto overscroll-contain rounded-b-2xl border-b border-border bg-background",
              layout === "pill-groups" ? "lg:hidden" : "md:hidden",
            )}
          >
            <div className="divide-y divide-border px-5">
              {items.map((item) => (
                <div key={item.id}>
                  {item.groups ? (
                    <>
                      <Button
                        variant="plain"
                        type="button"
                        aria-expanded={active === item.id}
                        aria-controls={`${id}-mobile-${item.id}`}
                        onClick={() =>
                          open(active === item.id ? null : item.id)
                        }
                        className="flex min-h-14 w-full items-center justify-between text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.label}
                        <motion.span
                          aria-hidden
                          animate={{ rotate: active === item.id ? 180 : 0 }}
                          transition={{ duration: reduce ? 0 : 0.2 }}
                        >
                          <ChevronDown className="size-4" />
                        </motion.span>
                      </Button>
                      {active === item.id && (
                        <motion.div
                          id={`${id}-mobile-${item.id}`}
                          initial={reduce ? false : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: reduce ? 0 : 0.18,
                            ease: EASE_OUT,
                          }}
                          className="pb-5"
                        >
                          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                            {item.groups.map((group) => (
                              <div key={group.title}>
                                <h2 className="mb-2 text-xs font-medium text-muted-foreground">
                                  {group.title}
                                </h2>
                                <ul>
                                  {group.links.map((link) => (
                                    <li key={link.label}>
                                      <a
                                        href={link.href}
                                        {...externalProps(link)}
                                        onClick={close}
                                        className="-ml-2 flex min-h-10 items-center rounded-lg px-2 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      >
                                        {link.label}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                          {item.featured && (
                            <a
                              href={item.featured.href}
                              {...externalProps(item.featured)}
                              onClick={close}
                              className="mt-5 flex items-center gap-3 rounded-2xl border border-border p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span
                                aria-hidden
                                className="grid size-10 shrink-0 place-items-center rounded-full bg-muted"
                              >
                                <Play className="size-4" />
                              </span>
                              <span>
                                <span className="block text-sm font-medium">
                                  {item.featured.label}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                  {item.featured.description}
                                </span>
                              </span>
                            </a>
                          )}
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <a
                      href={item.href}
                      onClick={close}
                      className="flex min-h-14 items-center rounded-lg text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.label}
                    </a>
                  )}
                </div>
              ))}
            </div>
            {signUp && (
              <a
                href={signUp.href}
                {...externalProps(signUp)}
                onClick={close}
                className="mx-5 flex min-h-12 items-center rounded-full text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {signUp.label}
              </a>
            )}
            <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-border bg-background p-4">
              <ButtonLink
                href={signIn.href}
                {...externalProps(signIn)}
                variant="outline"
                onClick={close}
              >
                {signIn.label}
              </ButtonLink>
              <ButtonLink
                href={cta.href}
                {...externalProps(cta)}
                onClick={close}
              >
                {cta.label}
              </ButtonLink>
            </div>
          </motion.div>
        )}
        {shownMenu && (
          <motion.div
            id={`${id}-panel`}
            initial={false}
            animate={{
              height:
                layout === "full-width"
                  ? panelHeight
                  : desktopOpen
                    ? panelHeight
                    : 0,
              clipPath:
                layout === "full-width" && !desktopOpen
                  ? "inset(0 0 100% 0)"
                  : "inset(0 0 0% 0)",
            }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    height: { duration: 0.25, ease: EASE_OUT },
                    clipPath: {
                      duration: desktopOpen ? 0.25 : 0.18,
                      ease: EASE_OUT,
                    },
                  }
            }
            aria-hidden={!desktopOpen}
            inert={!desktopOpen}
            style={{
              pointerEvents: desktopOpen ? "auto" : "none",
              width: layout === "pill-groups" ? navigationWidth : undefined,
              top:
                layout === "pill-groups"
                  ? pillBounds.top + pillBounds.height
                  : undefined,
            }}
            className={cn(
              "absolute top-full hidden overflow-hidden",
              layout === "pill-groups"
                ? "left-1/2 -translate-x-1/2 rounded-b-3xl lg:block"
                : "inset-x-0 bg-background md:block",
            )}
          >
            <div
              ref={contentRef}
              className={cn(
                "max-h-[75vh] overflow-y-auto border-border",
                layout === "pill-groups" ? "rounded-b-3xl" : "border-b",
              )}
            >
              <motion.div
                key={
                  layout === "pill-groups" ? shownMenu.id : "full-width-content"
                }
                initial={false}
                animate={{
                  opacity: desktopOpen ? 1 : 0,
                  transform:
                    layout === "full-width" && !desktopOpen && !reduce
                      ? "translateY(-4px)"
                      : "translateY(0px)",
                }}
                transition={{
                  duration: reduce ? 0 : desktopOpen ? 0.2 : 0.1,
                  delay: reduce || !desktopOpen ? 0 : 0.035,
                  ease: EASE_OUT,
                }}
                className={cn(
                  "mx-auto max-w-7xl",
                  layout === "pill-groups"
                    ? "p-6"
                    : "px-5 py-7 sm:px-8 md:py-9",
                )}
              >
                <div
                  className={cn(
                    "grid",
                    layout === "pill-groups"
                      ? "grid-cols-2 gap-x-4 gap-y-6"
                      : "gap-8 sm:grid-cols-2 md:grid-cols-4",
                  )}
                >
                  {shownMenu.groups?.map((group, index) => (
                    <div key={group.title}>
                      <motion.h2
                        {...revealText(0.06 + index * 0.025)}
                        className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground"
                      >
                        {group.title}
                      </motion.h2>
                      <ul className="space-y-1">
                        {group.links.map((link, linkIndex) => (
                          <motion.li
                            key={link.label}
                            {...revealText(
                              0.09 + index * 0.025 + linkIndex * 0.018,
                            )}
                          >
                            <a
                              href={link.href}
                              {...externalProps(link)}
                              onClick={close}
                              className="-ml-2 block rounded-lg px-2 py-2 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {link.label}
                            </a>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {shownMenu.featured && (
                    <motion.a
                      {...revealText(0.12)}
                      href={shownMenu.featured.href}
                      {...externalProps(shownMenu.featured)}
                      onClick={close}
                      className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div
                        aria-hidden
                        className="relative mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl"
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(135deg,#dcebed,#f4e5d2)",
                          }}
                        />
                        <div className="absolute h-28 w-36 -rotate-12 rounded-2xl border border-white/70 bg-white/20" />
                        <div className="absolute h-28 w-36 rotate-6 rounded-2xl border border-white/70 bg-white/40" />
                        <span className="relative grid size-12 place-items-center rounded-full border border-border bg-background text-foreground">
                          <Play className="ml-0.5 size-4" />
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {shownMenu.featured.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {shownMenu.featured.description}
                      </p>
                    </motion.a>
                  )}
                </div>
                <motion.div
                  {...revealText(0.14)}
                  className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"
                >
                  <p className="text-sm text-muted-foreground">
                    A little guidance goes a long way.
                  </p>
                  <a
                    href={cta.href}
                    {...externalProps(cta)}
                    onClick={close}
                    className="flex items-center gap-2 rounded-full py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {cta.label}
                    <ArrowUpRight aria-hidden className="size-4" />
                  </a>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </header>
    </>
  );
}
