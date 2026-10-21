import type { ReactElement, ReactNode } from "react";

export type NotificationItem = {
  /** Stable and unique across the feed. Items retain the order supplied. */
  id: string;
  title: string;
  description?: string;
  /** Caller-formatted time, so locale and time zone stay under app control. */
  time: string;
  /** Matches a custom filter id. `all` and `unread` are reserved filter ids. */
  category?: string;
  group?: string;
  read: boolean;
  icon?: ReactNode;
  /** Optional sender portrait. Decorative; identify the sender in the row text. */
  avatarUrl?: string;
  /** Show a row CTA when onSelect is provided; other rows stay compact. */
  actionLabel?: string;
  /** Optional expanded content. Keep interactive controls outside this field. */
  details?: ReactNode;
};

export type NotificationFilter = { id: string; label: string };

export type NotificationActions = {
  onReadChange?: (item: NotificationItem, read: boolean) => void;
  onMarkAllRead?: () => void;
  /** The host owns snooze scheduling and removes the item from this feed. */
  onSnooze?: (item: NotificationItem) => void;
  onArchive?: (item: NotificationItem) => void;
  onSelect?: (item: NotificationItem) => void;
};

export type NotificationDropdownProps = NotificationActions & {
  items: NotificationItem[];
  /** Additional category tabs after All. Defaults to All / Unread. */
  filters?: NotificationFilter[];
  title?: string;
  /** A single button that forwards its ref and click handler. */
  trigger?: ReactElement;
  footer?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Preferred alignment. Defaults to end; placement adjusts at viewport edges. */
  align?: "start" | "end";
  className?: string;
};

export type NotificationPanelProps = NotificationActions & {
  items: NotificationItem[];
  /** Additional category tabs after All. Defaults to All / Unread. */
  filters?: NotificationFilter[];
  title?: string;
  /** Optional controls beside the bulk read action. */
  headerActions?: ReactNode;
  footer?: ReactNode;
  /** Controlled search. Omit to let the panel manage its query. */
  query?: string;
  onQueryChange?: (query: string) => void;
  className?: string;
};
