import type { ReactNode } from "react";

export type LogLevel = "info" | "warn" | "error";
export type LogPayload =
  | string
  | number
  | boolean
  | null
  | LogPayload[]
  | { [key: string]: LogPayload };

export type LogEntry = {
  /** Unique, stable across updates. Supply entries in chronological order. */
  id: string;
  /** Caller-formatted timestamp; the host owns locale and time zone. */
  time: string;
  level: LogLevel;
  message: string;
  context?: string;
  payload?: LogPayload;
};

export type LogExplorerProps = {
  entries: LogEntry[];
  title?: string;
  service?: string;
  environment?: string;
  /** Freeze the visible snapshot; incoming entries remain owned by the host. */
  paused?: boolean;
  defaultPaused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  /** Optional controls beside Pause / Resume. */
  headerActions?: ReactNode;
  footer?: ReactNode;
  className?: string;
};
