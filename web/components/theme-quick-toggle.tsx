"use client";

import { useTranslations } from "next-intl";
import { Moon, Sun } from "./icons";
import { useTheme } from "./theme-provider";

export function ThemeQuickToggle() {
  const { theme, setTheme, ready } = useTheme();
  const t = useTranslations("Settings");
  const resolved =
    typeof document === "undefined"
      ? theme
      : (document.documentElement.dataset.theme ?? theme);
  const next =
    theme === "dark"
      ? "light"
      : theme === "light"
        ? "dark"
        : resolved === "dark"
          ? "light"
          : "dark";

  return (
    <button
      type="button"
      disabled={!ready}
      aria-label={next === "light" ? t("switchToLight") : t("switchToDark")}
      onClick={() => setTheme(next)}
      className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-surface-active hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
    >
      {next === "light" ? (
        <Sun className="size-[16px]" />
      ) : (
        <Moon className="size-[16px]" />
      )}
    </button>
  );
}
