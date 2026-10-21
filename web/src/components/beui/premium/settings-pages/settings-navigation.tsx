"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  Building2,
  ChevronRight,
  FileText,
  Globe2,
  Lightbulb,
  Link2,
  Menu,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const MotionPanel = motion.create(DialogPanel);
const MotionBackdrop = motion.create(DialogBackdrop);
const NAV_GROUPS = [
  {
    title: "Organization",
    items: [
      { id: "profile", label: "General", icon: Building2 },
      { id: "features", label: "AI features", icon: Lightbulb },
    ],
  },
  {
    title: "Publishing",
    items: [
      { id: "subdomain", label: "Subdomain", icon: Globe2 },
      { id: "domain", label: "Custom domain", icon: Link2 },
      { id: "content", label: "Default content", icon: FileText },
    ],
  },
];

export function SettingsNavigation({
  sectionPrefix,
  active,
  onNavigate,
}: {
  sectionPrefix: string;
  active: string;
  onNavigate: (section: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const navigation = (
    <nav aria-label="Organization settings" className="space-y-7">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${sectionPrefix}-${id}`}
                onClick={() => {
                  onNavigate(id);
                  setOpen(false);
                }}
                aria-current={active === id ? "location" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active === id
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon size={17} />
                {label}
                {active === id && (
                  <ChevronRight size={14} className="ml-auto" />
                )}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
  return (
    <>
      <div className="flex items-center justify-between px-5 py-3 md:hidden">
        <h2 className="text-xl font-medium">Settings</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open settings menu"
          aria-expanded={open}
          aria-haspopup="dialog"
          className="relative size-9 after:absolute after:-inset-1 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
        >
          <Menu size={20} />
        </Button>
      </div>
      <aside className="hidden px-5 py-8 md:block">
        <h2 className="mb-7 px-3 text-xl font-medium">Settings</h2>
        {navigation}
      </aside>
      <AnimatePresence initial={false}>
        {open && (
          <Dialog open onClose={setOpen} className="fixed inset-0 z-[100]">
            <MotionBackdrop
              className="fixed inset-0 bg-foreground/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: EASE_OUT }}
            />
            <MotionPanel
              className="fixed inset-y-0 left-0 flex w-80 max-w-[calc(100%-3rem)] flex-col rounded-r-2xl bg-background p-5 text-foreground"
              initial={{ x: reduce ? 0 : "-100%", opacity: reduce ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduce ? 0 : "-100%", opacity: reduce ? 0 : 1 }}
              transition={reduce ? { duration: 0 } : SPRING_PANEL}
            >
              <div className="mb-7 flex shrink-0 items-center justify-between px-3">
                <DialogTitle className="text-xl font-medium">
                  Settings
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close settings menu"
                  onClick={() => setOpen(false)}
                  className="relative size-9 after:absolute after:-inset-1 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                >
                  <X size={19} />
                </Button>
              </div>
              <div className="min-h-0 overflow-y-auto pb-5">{navigation}</div>
            </MotionPanel>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
