import type { ReactNode } from "react";

export type AuditActor = {
  /** Stable identity used by the actor filter. */
  id: string;
  name: string;
  avatarUrl?: string;
  kind?: "person" | "system";
};
export type AuditChange = {
  label: string;
  /** Caller-formatted values. null represents an unset value. */
  before: string | null;
  after: string | null;
};
export type AuditEvent = {
  /** Stable and unique within the trail. */
  id: string;
  actor: AuditActor;
  /** A short past-tense action, such as "changed the role for". */
  action: string;
  target: string;
  category: string;
  /** ISO timestamp for the semantic time element. */
  occurredAt: string;
  /** Caller-formatted time; the block does not assume a locale. */
  timeLabel: string;
  /** Events with the same day ID are grouped in their supplied order. */
  day: { id: string; label: string };
  description?: string;
  changes?: readonly AuditChange[];
  metadata?: readonly { label: string; value: string }[];
  icon?: ReactNode;
};
export type AuditTrailProps = {
  /** The host supplies recorded events, newest first. */
  events: readonly AuditEvent[];
  title?: string;
  headerActions?: ReactNode;
  /** Additional read-only event content. */
  renderDetails?: (event: AuditEvent) => ReactNode;
  className?: string;
};
