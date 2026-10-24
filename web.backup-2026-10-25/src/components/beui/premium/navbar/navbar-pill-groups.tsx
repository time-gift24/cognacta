"use client";

import {
  type MegaMenuItem,
  NavbarMegaMenu,
  type NavbarMegaMenuProps,
} from "./navbar-mega-menu";

export type NavbarPillGroupsProps = Omit<NavbarMegaMenuProps, "layout">;

const pillItems: MegaMenuItem[] = [
  {
    id: "product",
    label: "Product",
    groups: [
      {
        title: "Workspace",
        links: [
          { label: "Projects", href: "#projects" },
          { label: "Documents", href: "#documents" },
          { label: "Collaboration", href: "#collaboration" },
        ],
      },
      {
        title: "Make it yours",
        links: [
          { label: "Integrations", href: "#integrations" },
          { label: "Automations", href: "#automations" },
          { label: "Enterprise", href: "#enterprise" },
        ],
      },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    groups: [
      {
        title: "Learn",
        links: [
          { label: "Guides", href: "#guides" },
          { label: "Customer stories", href: "#stories" },
          { label: "Journal", href: "#journal" },
        ],
      },
      {
        title: "Build",
        links: [
          { label: "Documentation", href: "#docs" },
          { label: "Templates", href: "#templates" },
          { label: "What’s new", href: "#updates" },
        ],
      },
    ],
  },
  { id: "pricing", label: "Pricing", href: "#pricing" },
  { id: "download", label: "Download", href: "#download" },
];

export function NavbarPillGroups({
  items = pillItems,
  signUp = { label: "Sign up", href: "#signup" },
  ...props
}: NavbarPillGroupsProps) {
  return (
    <NavbarMegaMenu
      {...props}
      items={items}
      signUp={signUp}
      layout="pill-groups"
    />
  );
}
