"use client";

import Link from "next/link";
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
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/premium/animated-dropdown";

const STORAGE_KEY = "pair.preferences.v1";
const STYLES = ["Balanced", "Concise", "Detailed"] as const;
const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };
type Preferences = { style: string; instructions: string };
const DEFAULTS: Preferences = { style: "Balanced", instructions: "" };
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function WorkspaceSettings() {
  const { theme, setTheme, ready: themeReady, error: themeError } = useTheme();
  const ThemeIcon = THEME_ICONS[theme];
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [saved, setSaved] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (
        value &&
        STYLES.includes(value.style) &&
        typeof value.instructions === "string"
      ) {
        const restored = {
          style: value.style,
          instructions: value.instructions.slice(0, 1500),
        };
        setPreferences(restored);
        setSaved(restored);
      }
    } catch {
      setNotice("Could not load preferences from this browser.");
    }
    setReady(true);
  }, []);

  const dirty =
    preferences.style !== saved.style ||
    preferences.instructions !== saved.instructions;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-20 pb-10 sm:px-8 lg:pt-12">
      <header>
        <p className="mb-2 text-xs text-muted-foreground">
          Workspace / Settings
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Make Pair feel like your workspace.
        </p>
      </header>

      <section aria-labelledby="account-heading" className="mt-8">
        <h2 id="account-heading" className="mb-3 text-sm font-medium">
          Account
        </h2>
        <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-active text-sm font-medium">
            SA
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Saurabh</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Personal account
            </p>
          </div>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
            Demo profile
          </span>
        </div>
      </section>

      <section aria-labelledby="appearance-heading" className="mt-7">
        <h2 id="appearance-heading" className="mb-3 text-sm font-medium">
          Appearance
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-4">
          <div>
            <h3 className="text-sm">Theme</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a look, or match your device.
            </p>
          </div>
          <AnimatedDropdown>
            <AnimatedDropdownTrigger asChild>
              <button
                type="button"
                disabled={!themeReady}
                aria-label={`Theme: ${theme}`}
                className={`relative inline-flex h-8 items-center gap-2 rounded-full border border-border px-3 text-xs capitalize before:absolute before:-inset-y-1.5 before:inset-x-0 hover:bg-surface-raised ${focus}`}
              >
                <ThemeIcon className="size-4" />
                {theme}
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
                    <AnimatedDropdownRadioItem
                      key={value}
                      value={value}
                      className="capitalize"
                    >
                      <Icon className="size-4" />
                      {value}
                    </AnimatedDropdownRadioItem>
                  );
                })}
              </AnimatedDropdownRadioGroup>
            </AnimatedDropdownContent>
          </AnimatedDropdown>
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
            setNotice("Preferences saved in this browser.");
          } catch {
            setNotice(
              "Could not save preferences. Browser storage may be unavailable.",
            );
          }
        }}
      >
        <section aria-labelledby="preferences-heading" className="mt-7">
          <h2 id="preferences-heading" className="mb-3 text-sm font-medium">
            Personalization
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <h3 className="text-sm">Response style</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose how much detail you prefer.
                </p>
              </div>
              <AnimatedDropdown>
                <AnimatedDropdownTrigger asChild>
                  <button
                    type="button"
                    disabled={!ready}
                    aria-label={`Response style: ${preferences.style}`}
                    className={`relative inline-flex h-8 items-center gap-2 rounded-full border border-border px-3 text-xs before:absolute before:-inset-y-1.5 before:inset-x-0 hover:bg-surface-raised ${focus}`}
                  >
                    {preferences.style}
                    <ChevronDown className="size-3.5" />
                  </button>
                </AnimatedDropdownTrigger>
                <AnimatedDropdownContent align="end" className="w-40 min-w-0">
                  <AnimatedDropdownRadioGroup
                    value={preferences.style}
                    onValueChange={(style) => {
                      setPreferences((current) => ({ ...current, style }));
                      setNotice("");
                    }}
                  >
                    {STYLES.map((style) => (
                      <AnimatedDropdownRadioItem key={style} value={style}>
                        {style}
                      </AnimatedDropdownRadioItem>
                    ))}
                  </AnimatedDropdownRadioGroup>
                </AnimatedDropdownContent>
              </AnimatedDropdown>
            </div>
            <div className="border-t border-border p-4">
              <label htmlFor="instructions" className="text-sm">
                Custom instructions
              </label>
              <p
                id="instructions-help"
                className="mt-1 text-xs text-muted-foreground"
              >
                What should Pair know about how you work?
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
                placeholder="For example, keep explanations practical and use TypeScript for code examples."
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
            className={`h-11 ${focus}`}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            disabled={!ready || !dirty}
            className={`h-11 ${focus}`}
          >
            Save preferences
          </Button>
        </div>
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {notice}
        </p>
      </form>

      <section aria-labelledby="workspace-heading" className="mt-7">
        <h2 id="workspace-heading" className="mb-3 text-sm font-medium">
          Workspace
        </h2>
        <div className="divide-y divide-border rounded-2xl border border-border">
          <Link
            href="/integrations"
            className={`flex items-center gap-3 rounded-t-2xl p-4 hover:bg-surface-raised ${focus}`}
          >
            <LayoutGrid className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm">Connected apps</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Manage the tools you use with Pair.
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <div className="flex items-center gap-3 p-4">
            <UserCircle className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm">Your data stays local</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Chats, connections, and preferences are stored in this browser.
              </p>
            </div>
          </div>
        </div>
      </section>
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Template preview. Preferences are saved locally and do not change the
        simulated agent responses.
      </p>
    </div>
  );
}
