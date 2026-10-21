import type { ReactNode } from "react";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "changes_requested"
  | "declined";
export type ApprovalAction = Exclude<ApprovalStatus, "pending">;
export type ApprovalPerson = { name: string; avatarUrl?: string };
export type ApprovalAttachment = {
  id: string;
  name: string;
  description?: string;
  /** Optional host-provided URL. Files without a URL are informational. */
  href?: string;
};
export type ApprovalDecision = { action: ApprovalAction; note: string };
export type ApprovalRequest = {
  /** Stable and unique within the queue. Array order determines display order. */
  id: string;
  title: string;
  summary: string;
  category: string;
  icon?: ReactNode;
  status: ApprovalStatus;
  submittedBy: ApprovalPerson;
  /** Caller-formatted date labels; no clock or locale is assumed. */
  submittedAt: string;
  dueLabel?: string;
  reference?: string;
  fields?: { label: string; value: string }[];
  attachments?: ApprovalAttachment[];
  review?: {
    reviewer: ApprovalPerson;
    reviewedAt: string;
    note?: string;
  };
};
export type ApprovalQueueProps = {
  requests: ApprovalRequest[];
  /** The host persists the decision and updates requests. Reject to show an error. */
  onDecision?: (
    request: ApprovalRequest,
    decision: ApprovalDecision,
  ) => void | Promise<void>;
  title?: string;
  headerActions?: ReactNode;
  /** Extra review content, such as an image, diff, or domain-specific fields. */
  renderDetails?: (request: ApprovalRequest) => ReactNode;
  className?: string;
};
