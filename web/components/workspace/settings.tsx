"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/form-fields";
import { useTheme, type Theme } from "@/components/theme-provider";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Sun,
  Moon,
  Monitor,
  UserCircle,
} from "@/components/icons";
import { Button } from "@/components/motion/button/base";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/premium/animated-dropdown";

const STORAGE_KEY = "cognacta.preferences.v1";
const STYLES = ["Balanced", "Concise", "Detailed"] as const;
type Style = (typeof STYLES)[number];
const STYLE_LABEL_KEY: Record<Style, "styleBalanced" | "styleConcise" | "styleDetailed"> = {
  Balanced: "styleBalanced",
  Concise: "styleConcise",
  Detailed: "styleDetailed",
};
const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };
type Preferences = { style: Style; instructions: string };
const DEFAULTS: Preferences = { style: "Balanced", instructions: "" };
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function WorkspaceSettings() {
  const t = useTranslations("Settings");
  const { theme, setTheme, ready: themeReady, error: themeError } = useTheme();
  const ThemeIcon = THEME_ICONS[theme];
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [saved, setSaved] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "null",
      );
      if (
        value &&
        STYLES.includes(value.style) &&
        typeof value.instructions === "string"
      ) {
        const restored: Preferences = {
          style: value.style,
          instructions: value.instructions.slice(0, 1500),
        };
        setPreferences(restored);
        setSaved(restored);
      }
    } catch {
      setNotice(t("prefsLoadError"));
    }
    setReady(true);
    // Preferences are read once; locale changes reload the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty =
    preferences.style !== saved.style ||
    preferences.instructions !== saved.instructions;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-14 pb-8 sm:px-6 lg:pt-9">
      <header>
        <p className="mb-2 text-xs text-muted-foreground">
          {t("breadcrumb")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <section aria-labelledby="account-heading" className="mt-6">
        <h2 id="account-heading" className="mb-3 text-sm font-medium">
          {t("account")}
        </h2>
        <div className="flex items-center gap-3 rounded-2xl border border-border p-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-active text-sm font-medium">
            C
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Cognacta</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("workspace")}
            </p>
          </div>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
            {t("demoProfile")}
          </span>
        </div>
      </section>

      <section aria-labelledby="appearance-heading" className="mt-5">
        <h2 id="appearance-heading" className="mb-3 text-sm font-medium">
          {t("appearance")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
            <div>
              <h3 className="text-sm">{t("theme")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("themeHint")}
              </p>
            </div>
            <AnimatedDropdown>
              <AnimatedDropdownTrigger asChild>
                <button
                  type="button"
                  disabled={!themeReady}
                  aria-label={t("themeLabel", { theme: t(theme) })}
                  className={`relative inline-flex h-8 items-center gap-2 rounded-full border border-border px-3 text-xs before:absolute before:-inset-y-1.5 before:inset-x-0 hover:bg-surface-raised ${focus}`}
                >
                  <ThemeIcon className="size-4" />
                  {t(theme)}
                  <ChevronDown className="size-3.5" />
                </button>
              </AnimatedDropdownTrigger>
              <AnimatedDropdownContent align="end" className="w-40 min-w-0">
                <AnimatedDropdownRadioGroup
                  value={theme}
                  onValueChange={(value) => setTheme(value as Theme)}
                >
                  {(["light", "dark", "system"] as const).map((value) => {
                    const Icon = THEME_ICONS[value];
                    return (
                      <AnimatedDropdownRadioItem key={value} value={value}>
                        <Icon className="size-4" />
                        {t(value)}
                      </AnimatedDropdownRadioItem>
                    );
                  })}
                </AnimatedDropdownRadioGroup>
              </AnimatedDropdownContent>
            </AnimatedDropdown>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4">
            <div>
              <h3 className="text-sm">{t("language")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("languageHint")}
              </p>
            </div>
            <LocaleSwitcher />
          </div>
        </div>
        {themeError ? (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {themeError}
          </p>
        ) : null}
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
            setSaved(preferences);
            setNotice(t("prefsSaved"));
          } catch {
            setNotice(t("prefsSaveError"));
          }
        }}
      >
        <section aria-labelledby="preferences-heading" className="mt-5">
          <h2 id="preferences-heading" className="mb-3 text-sm font-medium">
            {t("personalization")}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div>
                <h3 className="text-sm">{t("responseStyle")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("responseStyleHint")}
                </p>
              </div>
              <AnimatedDropdown>
                <AnimatedDropdownTrigger asChild>
                  <button
                    type="button"
                    disabled={!ready}
                    aria-label={t("responseStyleLabel", {
                      style: t(STYLE_LABEL_KEY[preferences.style]),
                    })}
                    className={`relative inline-flex h-8 items-center gap-2 rounded-full border border-border px-3 text-xs before:absolute before:-inset-y-1.5 before:inset-x-0 hover:bg-surface-raised ${focus}`}
                  >
                    {t(STYLE_LABEL_KEY[preferences.style])}
                    <ChevronDown className="size-3.5" />
                  </button>
                </AnimatedDropdownTrigger>
                <AnimatedDropdownContent align="end" className="w-40 min-w-0">
                  <AnimatedDropdownRadioGroup
                    value={preferences.style}
                    onValueChange={(style) => {
                      if (!STYLES.includes(style as Style)) return;
                      setPreferences((current) => ({
                        ...current,
                        style: style as Style,
                      }));
                      setNotice("");
                    }}
                  >
                    {STYLES.map((style) => (
                      <AnimatedDropdownRadioItem key={style} value={style}>
                        {t(STYLE_LABEL_KEY[style])}
                      </AnimatedDropdownRadioItem>
                    ))}
                  </AnimatedDropdownRadioGroup>
                </AnimatedDropdownContent>
              </AnimatedDropdown>
            </div>
            <div className="border-t border-border p-4">
              <label htmlFor="instructions" className="text-sm">
                {t("customInstructions")}
              </label>
              <p
                id="instructions-help"
                className="mt-1 text-xs text-muted-foreground"
              >
                {t("instructionsHint")}
              </p>
              <Textarea
                id="instructions"
                aria-describedby="instructions-help"
                disabled={!ready}
                maxLength={1500}
                value={preferences.instructions}
                onChange={(event) => {
                  setPreferences((current) => ({
                    ...current,
                    instructions: event.target.value,
                  }));
                  setNotice("");
                }}
                placeholder={t("instructionsPlaceholder")}
                className="mt-3"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
                {preferences.instructions.length} / 1,500
              </p>
            </div>
          </div>
        </section>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            disabled={!ready || !dirty}
            onClick={() => {
              setPreferences(saved);
              setNotice("");
            }}
            className={`h-10 ${focus}`}
          >
            {t("discard")}
          </Button>
          <Button
            type="submit"
            disabled={!ready || !dirty}
            className={`h-10 ${focus}`}
          >
            {t("save")}
          </Button>
        </div>
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {notice}
        </p>
      </form>

      <section aria-labelledby="workspace-heading" className="mt-5">
        <h2 id="workspace-heading" className="mb-3 text-sm font-medium">
          {t("workspace")}
        </h2>
        <div className="divide-y divide-border rounded-2xl border border-border">
          <Link
            href="/integrations"
            className={`flex items-center gap-3 rounded-t-2xl p-3.5 hover:bg-surface-raised ${focus}`}
          >
            <LayoutGrid className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm">{t("connectedApps")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("connectedAppsHint")}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <div className="flex items-center gap-3 p-3.5">
            <UserCircle className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm">{t("dataLocal")}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t("dataLocalHint")}
              </p>
            </div>
          </div>
        </div>
      </section>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        {t("footnote")}
      </p>
    </div>
  );
}
