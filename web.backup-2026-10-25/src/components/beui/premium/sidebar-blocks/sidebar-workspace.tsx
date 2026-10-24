"use client";

import {
  Bot,
  Boxes,
  ChartNoAxesCombined,
  ChevronRight,
  ChevronsUpDown,
  CircleGauge,
  Command,
  FileText,
  GitBranch,
  KeyRound,
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
  AnimatedSidebarMenuSub,
  AnimatedSidebarMenuSubButton,
  AnimatedSidebarMenuSubItem,
  AnimatedSidebarProvider,
  AnimatedSidebarTrigger,
  useAnimatedSidebar,
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

const destinations = [
  {
    label: "Overview",
    icon: CircleGauge,
    keywords: ["home", "dashboard"],
  },
  {
    label: "Agents",
    icon: Bot,
    badge: "6",
    keywords: ["assistants", "ai"],
    children: ["All agents", "Playground", "Evaluations"],
  },
  {
    label: "Workflows",
    icon: GitBranch,
    keywords: ["automations", "runs"],
    children: ["Automations", "Run history", "Templates"],
  },
  {
    label: "Knowledge",
    icon: FileText,
    keywords: ["files", "documents"],
  },
  {
    label: "Integrations",
    icon: Boxes,
    keywords: ["apps", "connectors"],
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
    label: "API keys",
    icon: KeyRound,
    keywords: ["developer", "tokens"],
  },
  {
    label: "Settings",
    icon: Settings,
    keywords: ["preferences", "billing"],
  },
] satisfies {
  label: string;
  icon: typeof CircleGauge;
  badge?: string;
  keywords: string[];
  children?: string[];
}[];

const defaultWorkspaces = ["Northstar AI", "Acme Studio", "Orbit Labs"];

const searchItems: MorphingSearchItem[] = destinations.flatMap(
  ({ label, icon, keywords, children }) => [
    {
      id: label.toLowerCase().replaceAll(" ", "-"),
      title: label,
      description: "Workspace",
      keywords,
      icon,
    },
    ...(children ?? []).map((child) => ({
      id: `${label.toLowerCase()}-${child.toLowerCase()}`.replaceAll(" ", "-"),
      title: child,
      description: `${label} · Workspace`,
      keywords: [label, ...keywords],
      icon,
    })),
  ],
);

type SidebarSearchProps = {
  onSelect: (item: MorphingSearchItem) => void;
};

function SidebarSearch({ onSelect }: SidebarSearchProps) {
  const { state } = useAnimatedSidebar();
  const collapsed = state === "collapsed";

  return (
    <AnimatedSidebarMenuItem>
      <MorphingSearch
        items={searchItems}
        placeholder="Search workspace"
        shortcut=" "
        iconOnly={collapsed}
        onSelect={onSelect}
        className={cn(collapsed ? "mx-auto" : "h-10 w-full")}
      />
    </AnimatedSidebarMenuItem>
  );
}

export type SidebarWorkspaceProps = {
  workspaceName?: string;
  workspaces?: readonly string[];
  onWorkspaceChange?: (workspace: string) => void;
  account?: { name: string; email: string; initials: string };
  className?: string;
};

export function SidebarWorkspace({
  workspaceName = "Northstar AI",
  workspaces = defaultWorkspaces,
  onWorkspaceChange,
  account = { name: "Maya Chen", email: "maya@northstar.ai", initials: "MC" },
  className,
}: SidebarWorkspaceProps) {
  const workspaceOptions = useMemo(
    () => Array.from(new Set([workspaceName, ...workspaces])),
    [workspaceName, workspaces],
  );
  const [activeWorkspace, setActiveWorkspace] = useState(workspaceName);
  const [active, setActive] = useState("Overview");
  const [openSection, setOpenSection] = useState<string | null>("Agents");

  return (
    <div className={cn("w-full px-0 py-2 sm:p-3", className)}>
      <AnimatedSidebarProvider className="h-[720px] min-h-0 overflow-hidden rounded-2xl border border-foreground/[0.08] bg-background">
        <AnimatedSidebar
          ariaLabel={`${activeWorkspace} workspace`}
          collapsible="icon"
          className="min-h-0"
          panelClassName="h-full border-foreground/[0.08]"
        >
          <AnimatedSidebarHeader className="p-3 pb-2">
            <div className="flex min-h-11 items-center gap-3 overflow-hidden px-2">
              <AnimatedDropdown>
                <AnimatedDropdownTrigger asChild>
                  <Button
                    variant="plain"
                    type="button"
                    aria-label={`Switch workspace, current workspace ${activeWorkspace}`}
                    className="group flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
                  >
                    <span className="grid size-7 shrink-0 place-items-center bg-foreground text-background rounded-full">
                      <Command aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-foreground text-sm group-data-[state=collapsed]/sidebar:hidden">
                      {activeWorkspace}
                    </span>
                    <ChevronsUpDown
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-muted-foreground group-data-[state=collapsed]/sidebar:hidden"
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
              <AnimatedSidebarClose className="ml-auto text-muted-foreground hover:bg-muted md:hidden">
                <X aria-hidden="true" className="size-4" />
              </AnimatedSidebarClose>
            </div>
          </AnimatedSidebarHeader>

          <AnimatedSidebarContent className="px-2 pt-1">
            <AnimatedSidebarGroup className="pb-2">
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu>
                  <SidebarSearch
                    onSelect={(item) => {
                      setActive(item.title);
                      const parent = destinations.find((destination) =>
                        destination.children?.includes(item.title),
                      );
                      if (parent) setOpenSection(parent.label);
                    }}
                  />
                </AnimatedSidebarMenu>
              </AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>

            <AnimatedSidebarGroup className="pt-1">
              <AnimatedSidebarGroupLabel>Workspace</AnimatedSidebarGroupLabel>
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu>
                  {destinations.map(
                    ({ label, icon: Icon, badge, children }) => (
                      <AnimatedSidebarMenuItem key={label}>
                        <AnimatedSidebarMenuButton
                          isActive={
                            active === label ||
                            children?.includes(active) === true
                          }
                          ariaExpanded={
                            children ? openSection === label : undefined
                          }
                          icon={<Icon className="size-4" />}
                          badge={badge}
                          onSelect={() => {
                            setOpenSection((current) => {
                              if (!children) {
                                setActive(label);
                                return null;
                              }
                              return current === label ? null : label;
                            });
                          }}
                        >
                          {label}
                        </AnimatedSidebarMenuButton>
                        {children ? (
                          <AnimatedSidebarMenuSub open={openSection === label}>
                            {children.map((child) => (
                              <AnimatedSidebarMenuSubItem key={child}>
                                <AnimatedSidebarMenuSubButton
                                  isActive={active === child}
                                  onSelect={() => setActive(child)}
                                >
                                  {child}
                                </AnimatedSidebarMenuSubButton>
                              </AnimatedSidebarMenuSubItem>
                            ))}
                          </AnimatedSidebarMenuSub>
                        ) : null}
                      </AnimatedSidebarMenuItem>
                    ),
                  )}
                </AnimatedSidebarMenu>
              </AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>
          </AnimatedSidebarContent>

          <AnimatedSidebarFooter className="gap-3 border-none p-3">
            <div className="relative flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-xl p-1 text-left transition-colors hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
                {account.initials}
              </span>
              <span className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
                <span className="block truncate font-medium text-foreground text-sm">
                  {account.name}
                </span>
                <span className="block truncate text-muted-foreground text-xs">
                  {account.email}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground group-data-[state=collapsed]/sidebar:hidden"
              />
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
            <p className="font-medium text-foreground text-sm">{active}</p>
          </header>

          <div className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden p-5 sm:p-7">
            <div>
              <p className="font-medium text-muted-foreground text-xs">
                Live workspace
              </p>
              <h3 className="mt-2 max-w-md tracking-tight text-xl font-medium">
                Good morning, Maya.
              </h3>
              <p className="mt-2 max-w-md text-muted-foreground text-sm leading-6">
                Your workspace stays in place while the navigation folds into a
                focused icon rail.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Runs", "1,284"],
                ["Success rate", "98.4%"],
                ["Time saved", "42h"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-border p-4"
                >
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="mt-4 font-semibold text-xl">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSidebarInset>
      </AnimatedSidebarProvider>
    </div>
  );
}
