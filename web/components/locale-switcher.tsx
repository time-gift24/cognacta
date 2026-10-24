"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, Globe2 } from "@/components/icons";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/premium/animated-dropdown";
import { isLocale, localeCookie, locales, type Locale } from "@/i18n/config";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function LocaleSwitcher() {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current: Locale = isLocale(locale) ? locale : "zh";
  const label = (value: Locale) =>
    value === "zh" ? t("chinese") : t("english");

  function change(next: Locale) {
    if (next === current) return;
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label={t("languageLabel", { language: label(current) })}
          className={`relative inline-flex h-8 items-center gap-2 rounded-full border border-border px-3 text-xs before:absolute before:-inset-y-1.5 before:inset-x-0 hover:bg-surface-raised ${focus}`}
        >
          <Globe2 className="size-4" />
          {label(current)}
          <ChevronDown className="size-3.5" />
        </button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent align="end" className="w-40 min-w-0">
        <AnimatedDropdownRadioGroup
          value={current}
          onValueChange={(value) => {
            if (isLocale(value)) change(value);
          }}
        >
          {locales.map((value) => (
            <AnimatedDropdownRadioItem key={value} value={value}>
              {label(value)}
            </AnimatedDropdownRadioItem>
          ))}
        </AnimatedDropdownRadioGroup>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}
