"use client";

import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronsUpDown,
  Command,
  FileText,
  FolderKanban,
  Inbox,
  type LucideIcon,
  PanelLeft,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  AnimatedSidebarTrigger,
} from "@/components/beui/motion/animated-sidebar";
import { Button } from "@/components/beui/motion/button";
import {
  MorphingSearch,
  type MorphingSearchItem,
} from "@/components/beui/motion/morphing-search";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItemText,
  AnimatedDropdownLabel,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import { cn } from "@/lib/beui/utils";

export type SidebarOffcanvasNavigationItem = {
  label: string;
  icon: LucideIcon;
  keywords?: readonly string[];
  badge?: string;
};

const defaultNavigationItems = [
  {
    label: "Inbox",
    icon: Inbox,
    keywords: ["messages", "updates"],
    badge: "12",
  },
  {
    label: "Projects",
    icon: FolderKanban,
    keywords: ["work", "boards"],
  },
  {
    label: "Calendar",
    icon: CalendarDays,
    keywords: ["schedule", "events"],
  },
  {
    label: "Documents",
    icon: FileText,
    keywords: ["files", "notes"],
  },
  {
    label: "Analytics",
    icon: ChartNoAxesCombined,
    keywords: ["reports", "usage"],
  },
  {
    label: "Members",
    icon: Users,
    keywords: ["team", "people"],
  },
  {
    label: "Settings",
    icon: Settings,
    keywords: ["preferences", "billing"],
  },
] satisfies SidebarOffcanvasNavigationItem[];

const defaultWorkspaces = ["Northstar AI", "Acme Studio", "Orbit Labs"];

export type SidebarOffcanvasProps = {
  workspaceName?: string;
  workspaces?: readonly string[];
  onWorkspaceChange?: (workspace: string) => void;
  navigationItems?: readonly SidebarOffcanvasNavigationItem[];
  activeItem?: string;
  defaultActiveItem?: string;
  onNavigate?: (item: SidebarOffcanvasNavigationItem) => void;
  account?: { name: string; email: string; initials: string };
  className?: string;
};

export function SidebarOffcanvas({
  workspaceName = "Northstar AI",
  workspaces = defaultWorkspaces,
  onWorkspaceChange,
  navigationItems = defaultNavigationItems,
  activeItem,
  defaultActiveItem = "Inbox",
  onNavigate,
  account = { name: "Maya Chen", email: "maya@northstar.ai", initials: "MC" },
  className,
}: SidebarOffcanvasProps) {
  const workspaceOptions = useMemo(
    () => Array.from(new Set([workspaceName, ...workspaces])),
    [workspaceName, workspaces],
  );
  const searchItems = useMemo<MorphingSearchItem[]>(
    () =>
      navigationItems.map((item) => ({
        id: item.label.toLowerCase().replaceAll(" ", "-"),
        title: item.label,
        description: "Navigation",
        keywords: [...(item.keywords ?? [])],
        icon: item.icon,
      })),
    [navigationItems],
  );
  const [activeWorkspace, setActiveWorkspace] = useState(workspaceName);
  const [internalActiveItem, setInternalActiveItem] =
    useState(defaultActiveItem);
  const selectedItem = activeItem ?? internalActiveItem;

  const selectItem = (label: string) => {
    const item = navigationItems.find((entry) => entry.label === label);
    if (!item) return;
    if (activeItem === undefined) setInternalActiveItem(label);
    onNavigate?.(item);
  };

  return (
    <div className={cn("w-full px-0 py-2 sm:p-3", className)}>
      <AnimatedSidebarProvider className="h-[720px] min-h-0 overflow-hidden rounded-2xl border border-foreground/[0.08] bg-background">
        <AnimatedSidebar
          ariaLabel={`${activeWorkspace} navigation`}
          collapsible="offcanvas"
          className="min-h-0"
          panelClassName="h-full border-foreground/[0.08] bg-muted/25"
        >
          <AnimatedSidebarHeader className="p-3 pb-2">
            <div className="flex min-h-11 items-center gap-2 px-2">
              <AnimatedDropdown>
                <AnimatedDropdownTrigger asChild>
                  <Button
                    variant="plain"
                    type="button"
                    aria-label={`Switch workspace, current workspace ${activeWorkspace}`}
                    className="group flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
                  >
                    <span className="grid size-8 shrink-0 place-items-center bg-foreground text-background rounded-full">
                      <Command aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-foreground text-sm">
                      {activeWorkspace}
                    </span>
                    <ChevronsUpDown
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                  </Button>
                </AnimatedDropdownTrigger>

                <AnimatedDropdownContent
                  align="start"
                  side="bottom"
                  sideOffset={8}
                  collisionPadding={12}
                  className="w-60"
                >
                  <AnimatedDropdownLabel>Workspaces</AnimatedDropdownLabel>
                  <AnimatedDropdownRadioGroup
                    value={activeWorkspace}
                    onValueChange={(workspace) => {
                      setActiveWorkspace(workspace);
                      onWorkspaceChange?.(workspace);
                    }}
                  >
                    {workspaceOptions.map((workspace) => (
                      <AnimatedDropdownRadioItem
                        key={workspace}
                        value={workspace}
                      >
                        <AnimatedDropdownItemText>
                          {workspace}
                        </AnimatedDropdownItemText>
                      </AnimatedDropdownRadioItem>
                    ))}
                  </AnimatedDropdownRadioGroup>
                </AnimatedDropdownContent>
              </AnimatedDropdown>

              <AnimatedSidebarClose className="text-muted-foreground hover:bg-muted md:hidden">
                <X aria-hidden="true" className="size-4" />
              </AnimatedSidebarClose>
            </div>
          </AnimatedSidebarHeader>

          <AnimatedSidebarContent className="px-2 pt-2">
            <AnimatedSidebarGroup className="pb-3">
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu>
                  <AnimatedSidebarMenuItem>
                    <MorphingSearch
                      items={searchItems}
                      placeholder="Search navigation"
                      shortcut=" "
                      onSelect={(item) => selectItem(item.title)}
                      className="h-10 w-full"
                    />
                  </AnimatedSidebarMenuItem>
                </AnimatedSidebarMenu>
              </AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>

            <AnimatedSidebarGroup className="pt-1">
              <AnimatedSidebarGroupLabel>Navigation</AnimatedSidebarGroupLabel>
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <AnimatedSidebarMenuItem key={item.label}>
                        <AnimatedSidebarMenuButton
                          isActive={selectedItem === item.label}
                          icon={<Icon className="size-4" />}
                          badge={item.badge}
                          onSelect={() => selectItem(item.label)}
                        >
                          {item.label}
                        </AnimatedSidebarMenuButton>
                      </AnimatedSidebarMenuItem>
                    );
                  })}
                </AnimatedSidebarMenu>
              </AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>
          </AnimatedSidebarContent>

          <AnimatedSidebarFooter className="border-none p-3">
            <div className="relative flex min-h-11 w-full items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
                {account.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground text-sm">
                  {account.name}
                </span>
                <span className="block truncate text-muted-foreground text-xs">
                  {account.email}
                </span>
              </span>
              {/* Full-row control; the shared Button is always pill-shaped, so the
                  row keeps its own radius and this sits on top. */}
              <Button
                variant="plain"
                type="button"
                aria-label={account.name}
                whileHover={undefined}
                whileTap={undefined}
                className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </AnimatedSidebarFooter>
        </AnimatedSidebar>

        <AnimatedSidebarInset className="min-h-0 bg-background">
          <header className="flex h-16 shrink-0 items-center gap-3 border-border border-b px-4">
            <AnimatedSidebarTrigger className="text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <PanelLeft aria-hidden="true" className="size-4" />
            </AnimatedSidebarTrigger>
            <div className="h-5 w-px bg-border" />
            <p className="font-medium text-foreground text-sm">
              {selectedItem}
            </p>
            <Button
              variant="plain"
              type="button"
              aria-label="Notifications"
              className="ml-auto grid size-9 place-items-center text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell aria-hidden="true" className="size-4" />
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden p-5 sm:p-7">
            <div>
              <p className="font-medium text-muted-foreground text-xs">
                Focus workspace
              </p>
              <h3 className="mt-2 max-w-lg tracking-tight text-xl font-medium">
                Everything important, without nested navigation.
              </h3>
              <p className="mt-2 max-w-lg text-muted-foreground text-sm leading-6">
                Collapse the sidebar to give the active workspace the full
                canvas. The navigation returns from the same edge when needed.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-5">
                <p className="text-muted-foreground text-xs">Open projects</p>
                <p className="mt-5 font-semibold text-2xl">18</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-5">
                <p className="text-muted-foreground text-xs">Updates today</p>
                <p className="mt-5 font-semibold text-2xl">32</p>
              </div>
            </div>
          </div>
        </AnimatedSidebarInset>
      </AnimatedSidebarProvider>
    </div>
  );
}
