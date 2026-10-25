"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Folder,
  HelpCircle,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
} from "@/components/icons";
import { Avatar } from "@/components/arc/avatar/avatar";
import { Badge } from "@/components/arc/badge/badge";
import { TextMorph } from "@/components/arc/text-morph/text-morph";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/arc/menu/menu";
import { BrandMark } from "@/components/brand-mark";
import type { Theme } from "@/components/theme-provider";
import { modeDefs } from "./config";
import type { Mode } from "./types";
import { RailTip } from "./sidebar-rows";
import styles from "./sidebar.module.css";

export function WorkspaceMenu({
  rail,
  mode,
  theme,
  onModeChange,
  onThemeChange,
  onSearchAll,
  onManageProjects,
  onSettings,
  onHelp,
}: {
  rail: boolean;
  mode: Mode;
  theme: Theme;
  onModeChange: (mode: Mode) => void;
  onThemeChange: (theme: Theme) => void;
  onSearchAll: () => void;
  onManageProjects: () => void;
  onSettings: () => void;
  onHelp: () => void;
}) {
  const t = useTranslations("Nav");
  const tModes = useTranslations("Modes");
  const tSettings = useTranslations("Settings");
  const trigger = useRef<HTMLButtonElement>(null);
  const meta = `${tModes(mode)} · ${t("workspaceMeta")}`;

  return (
    <Menu>
      <RailTip
        enabled={rail}
        label={t("workspaceName")}
        note={t("workspaceMenuHint")}
        side="right"
      >
        <MenuTrigger asChild>
          <button
            ref={trigger}
            type="button"
            className={styles.switcher}
            aria-label={`${t("workspaceName")}, ${meta}. ${t("workspaceMenu")}`}
            onBlur={(event) => delete event.currentTarget.dataset.pointerFocus}
            onKeyDown={(event) => delete event.currentTarget.dataset.pointerFocus}
          >
            <span className={styles.mark} aria-hidden="true">
              <BrandMark className="size-[18px]" />
            </span>
            <span className={styles.switcherText}>
              <span className={styles.workspaceName}>{t("workspaceName")}</span>
              <TextMorph as="span" className={styles.workspaceMeta}>
                {meta}
              </TextMorph>
            </span>
            <ChevronDown className={styles.chevron} aria-hidden="true" />
          </button>
        </MenuTrigger>
      </RailTip>
      <MenuContent
        align="start"
        side="bottom"
        sideOffset={6}
        className={styles.workspaceMenu}
        triggerRef={trigger}
      >
        <MenuLabel>{t("view")}</MenuLabel>
        <MenuRadioGroup
          value={mode}
          onValueChange={(value) => onModeChange(value as Mode)}
        >
          {modeDefs.map((item) => (
            <MenuRadioItem
              key={item.value}
              value={item.value}
              icon={<item.icon className="size-4" />}
            >
              {tModes(item.value)}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuLabel>{t("appearance")}</MenuLabel>
        <MenuRadioGroup
          value={theme}
          onValueChange={(value) => onThemeChange(value as Theme)}
        >
          <MenuRadioItem value="dark" icon={<Moon className="size-4" />}>
            {tSettings("dark")}
          </MenuRadioItem>
          <MenuRadioItem value="light" icon={<Sun className="size-4" />}>
            {tSettings("light")}
          </MenuRadioItem>
          <MenuRadioItem value="system" icon={<Monitor className="size-4" />}>
            {tSettings("system")}
          </MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem
          icon={<Search className="size-4" />}
          shortcut="⌘K"
          onSelect={onSearchAll}
        >
          {t("searchAll")}
        </MenuItem>
        <MenuItem
          icon={<Folder className="size-4" />}
          onSelect={onManageProjects}
        >
          {t("manageProjects")}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Settings className="size-4" />} onSelect={onSettings}>
          {t("settings")}
        </MenuItem>
        <MenuItem icon={<HelpCircle className="size-4" />} onSelect={onHelp}>
          {t("help")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function ProfileMenu({
  rail,
  onSettings,
  onManageProjects,
  onHelp,
}: {
  rail: boolean;
  onSettings: () => void;
  onManageProjects: () => void;
  onHelp: () => void;
}) {
  const t = useTranslations("Nav");
  const tProfile = useTranslations("Profile");
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <Menu>
      <RailTip
        enabled={rail}
        label={t("workspaceName")}
        note={t("localAccount")}
        side="right"
      >
        <MenuTrigger asChild>
          <button
            ref={trigger}
            type="button"
            className={styles.user}
            aria-label={`${t("workspaceName")}, ${t("localAccount")}. ${t("openAccountMenu")}`}
            onBlur={(event) => delete event.currentTarget.dataset.pointerFocus}
            onKeyDown={(event) => delete event.currentTarget.dataset.pointerFocus}
          >
            <Avatar name={t("workspaceName")} size="md" />
            <span className={styles.userText}>
              <span className={styles.userName}>{t("workspaceName")}</span>
              <TextMorph as="span" className={styles.userStatus}>
                {t("localAccount")}
              </TextMorph>
            </span>
            <ChevronDown className={styles.chevron} aria-hidden="true" />
          </button>
        </MenuTrigger>
      </RailTip>
      <MenuContent
        align="start"
        side="top"
        sideOffset={8}
        className={styles.profileMenu}
        triggerRef={trigger}
      >
        <div className={styles.profileHead}>
          <Avatar name={t("workspaceName")} size="md" />
          <div className={styles.profileIdentity}>
            <p className={styles.profileName}>
              <span>{t("workspaceName")}</span>
              <Badge size="sm" tone="neutral">
                {t("localAccount")}
              </Badge>
            </p>
            <span className={styles.profileMeta}>{t("workspace")}</span>
          </div>
        </div>
        <MenuSeparator />
        <MenuItem icon={<Settings className="size-4" />} onSelect={onSettings}>
          {tProfile("settings")}
        </MenuItem>
        <MenuItem
          icon={<Folder className="size-4" />}
          onSelect={onManageProjects}
        >
          {t("manageProjects")}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<HelpCircle className="size-4" />} onSelect={onHelp}>
          {tProfile("help")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
