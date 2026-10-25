"use client";

import { useEffect, useState } from "react";
import type { Project, Session } from "./types";

const PREFIX = "cognacta.";
export const STORAGE_LIMIT = 5 * 1024 * 1024;

type Usage = { bytes: number; unavailable: boolean };

/**
 * The footer meter reports what this browser actually stores under the
 * `cognacta.*` namespace. It runs after the provider's save effect, so the
 * number includes the change that just happened.
 */
export function useStorageUsage(
  sessions: Session[],
  projects: Project[],
  revision?: unknown,
) {
  const [usage, setUsage] = useState<Usage>({ bytes: 0, unavailable: false });

  useEffect(() => {
    let frame = 0;
    const read = () => {
      try {
        let bytes = 0;
        const encoder = new TextEncoder();
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (!key?.startsWith(PREFIX)) continue;
          const value = localStorage.getItem(key) ?? "";
          bytes += encoder.encode(key + value).length;
        }
        setUsage({ bytes, unavailable: false });
      } catch {
        setUsage((current) => ({ ...current, unavailable: true }));
      }
    };
    // Wait one frame for the workspace provider's own persistence effect.
    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [sessions, projects, revision]);

  const percent = Math.min(100, (usage.bytes / STORAGE_LIMIT) * 100);
  return { ...usage, percent, limit: STORAGE_LIMIT };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
