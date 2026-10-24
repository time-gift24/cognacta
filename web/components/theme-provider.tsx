"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light" | "system";
const KEY = "cognacta.theme.v1";
const ThemeContext = createContext<{
  theme: Theme;
  ready: boolean;
  error: string;
  setTheme: (theme: Theme) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("Settings");
  const [theme, updateTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === "light" || stored === "dark" || stored === "system")
        updateTheme(stored);
    } catch {
      /* The default remains available without browser storage. */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, ready]);

  function setTheme(value: Theme) {
    updateTheme(value);
    setError("");
    try {
      localStorage.setItem(KEY, value);
    } catch {
      setError(t("themeSaveError"));
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, ready, error, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}
