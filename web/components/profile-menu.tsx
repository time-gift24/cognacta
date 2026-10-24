"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ChevronDown, HelpCircle, LogOut, Settings, UserCircle } from "./icons";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownItemIcon,
  AnimatedDropdownItemText,
  AnimatedDropdownLabel,
  AnimatedDropdownSeparator,
  AnimatedDropdownTrigger,
} from "./premium/animated-dropdown";

export function ProfileMenu({ onSignOut }: { onSignOut?: () => void }) {
  const router = useRouter();
  const t = useTranslations("Profile");
  const tNav = useTranslations("Nav");
  return (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger asChild>
        <button
          type="button"
          aria-label={tNav("openProfileMenu")}
          className="group flex min-h-12 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-active data-[state=open]:bg-surface-active focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-active text-xs font-medium text-foreground">
            C
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {tNav("workspaceName")}
            </span>
            <span className="block text-xs text-muted-foreground">
              {tNav("workspace")}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-56"
      >
        <AnimatedDropdownLabel>{t("account")}</AnimatedDropdownLabel>
        {[
          { label: t("profile"), icon: UserCircle },
          { label: t("settings"), icon: Settings },
        ].map(({ label, icon: Icon }) => (
          <AnimatedDropdownItem
            key={label}
            onSelect={() => router.push("/settings")}
          >
            <AnimatedDropdownItemIcon>
              <Icon />
            </AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>{label}</AnimatedDropdownItemText>
          </AnimatedDropdownItem>
        ))}
        <AnimatedDropdownSeparator />
        <AnimatedDropdownItem onSelect={() => router.push("/help")}>
          <AnimatedDropdownItemIcon>
            <HelpCircle />
          </AnimatedDropdownItemIcon>
          <AnimatedDropdownItemText>{t("help")}</AnimatedDropdownItemText>
        </AnimatedDropdownItem>
        {onSignOut && (
          <>
            <AnimatedDropdownSeparator />
            <AnimatedDropdownItem onSelect={onSignOut}>
              <AnimatedDropdownItemIcon>
                <LogOut />
              </AnimatedDropdownItemIcon>
              <AnimatedDropdownItemText>{t("signOut")}</AnimatedDropdownItemText>
            </AnimatedDropdownItem>
          </>
        )}
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}
