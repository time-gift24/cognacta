export type TeamRoleId = "admin" | "member" | "viewer" | (string & {});

export type TeamRole = {
  id: TeamRoleId;
  label: string;
  description: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRoleId;
  avatar?: string;
  /** Short, human label such as "Active now" or "2h ago". */
  lastActive: string;
  online?: boolean;
  /** Owners cannot be edited or removed. */
  owner?: boolean;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: TeamRoleId;
  /** Short, human label such as "Just now" or "3d ago". */
  invitedAt: string;
  avatar?: string;
};

export type InviteLink = {
  url: string;
  role: TeamRoleId;
  enabled: boolean;
  /** Shown under the link, for example "Expires in 7 days". */
  expiresLabel: string;
};

export type TeamInviteLabels = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailHint: string;
  roleLabel: string;
  noteLabel: string;
  notePlaceholder: string;
  send: string;
  sending: string;
  sent: string;
  /** Text after the rolling count, for example "of 10 seats used". */
  seatsOf: (limit: number) => string;
  /** Full sentence announced to screen readers. */
  seatsSummary: (used: number, limit: number) => string;
  seatsOver: (over: number) => string;
  seatsLeft: (left: number) => string;
  invalidBlocking: (count: number) => string;
  duplicate: (email: string) => string;
  membersTab: string;
  pendingTab: string;
  emptyPending: string;
  invited: (time: string) => string;
  resend: string;
  resent: string;
  revoke: string;
  linkTitle: string;
  linkDescription: string;
  linkEnabled: string;
  linkDisabledNote: string;
  copyLink: string;
  copied: string;
  resetLink: string;
  resetTitle: string;
  resetDescription: string;
  resetConfirm: string;
  resetting: string;
  resetDone: string;
  cancel: string;
  linkRoleLabel: string;
  owner: string;
  teamTitle: string;
  teamDescription: string;
  openInvite: string;
  closeInvite: string;
};

export const DEFAULT_LABELS: TeamInviteLabels = {
  title: "Invite teammates",
  description: "Add people to Northwind Studio. They get an email to join.",
  emailLabel: "Email addresses",
  emailPlaceholder: "name@company.com",
  emailHint: "Press Enter, comma, or space to add. Paste a list to add many.",
  roleLabel: "Role for this batch",
  noteLabel: "Personal note",
  notePlaceholder: "Optional. Shown in the invite email.",
  send: "Send invites",
  sending: "Sending",
  sent: "Invites sent",
  seatsOf: (limit) => `of ${limit} seats used`,
  seatsSummary: (used, limit) => `${used} of ${limit} seats used`,
  seatsOver: (over) =>
    `${over} ${over === 1 ? "invite exceeds" : "invites exceed"} your seat limit`,
  seatsLeft: (left) => `${left} ${left === 1 ? "seat" : "seats"} left`,
  invalidBlocking: (count) =>
    `Fix or remove ${count} invalid ${count === 1 ? "address" : "addresses"}`,
  duplicate: (email) => `${email} is already in this batch`,
  membersTab: "Members",
  pendingTab: "Pending",
  emptyPending: "No pending invites. New invites land here.",
  invited: (time) => `Invited ${time}`,
  resend: "Resend",
  resent: "Sent",
  revoke: "Revoke",
  linkTitle: "Invite link",
  linkDescription: "Anyone with this link can join the workspace.",
  linkEnabled: "Allow joining by link",
  linkDisabledNote: "Link is off. People who open it see a closed page.",
  copyLink: "Copy invite link",
  copied: "Link copied",
  resetLink: "Reset link",
  resetTitle: "Reset invite link?",
  resetDescription:
    "The current link stops working right away. Anyone who has not joined yet needs the new one.",
  resetConfirm: "Reset link",
  resetting: "Resetting",
  resetDone: "New link ready",
  cancel: "Cancel",
  linkRoleLabel: "Joins as",
  teamTitle: "Team",
  teamDescription:
    "Manage who can access Northwind Studio and invite new people.",
  openInvite: "Invite teammates",
  closeInvite: "Close invite form",
  owner: "Owner",
};

export const DEFAULT_ROLES: readonly TeamRole[] = [
  {
    id: "admin",
    label: "Admin",
    description: "Manages billing, seats, and settings",
  },
  {
    id: "member",
    label: "Member",
    description: "Creates and edits projects",
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Can view and comment only",
  },
];

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=96&h=96&q=80`;

export const DEFAULT_MEMBERS: readonly TeamMember[] = [
  {
    id: "m-ana",
    name: "Ana Okafor",
    email: "ana@northwind.studio",
    role: "admin",
    avatar: photo("1494790108377-be9c29b29330"),
    lastActive: "Active now",
    online: true,
    owner: true,
  },
  {
    id: "m-jon",
    name: "Jon Reyes",
    email: "jon@northwind.studio",
    role: "admin",
    avatar: photo("1500648767791-00dcc994a43e"),
    lastActive: "12m ago",
    online: true,
  },
  {
    id: "m-lena",
    name: "Lena Brandt",
    email: "lena@northwind.studio",
    role: "member",
    avatar: photo("1438761681033-6461ffad8d80"),
    lastActive: "2h ago",
  },
  {
    id: "m-rui",
    name: "Rui Tanaka",
    email: "rui@northwind.studio",
    role: "member",
    avatar: photo("1507003211169-0a1dd7228f2d"),
    lastActive: "Yesterday",
  },
  {
    id: "m-sofia",
    name: "Sofia Marin",
    email: "sofia@northwind.studio",
    role: "viewer",
    avatar: photo("1529626455594-4ff0802cfb7e"),
    lastActive: "3d ago",
  },
];

export const DEFAULT_PENDING: readonly PendingInvite[] = [
  {
    id: "p-theo",
    email: "theo@northwind.studio",
    role: "member",
    invitedAt: "2d ago",
    avatar: photo("1506794778202-cad84cf45f1d"),
  },
  {
    id: "p-priya",
    email: "priya.k@fieldnotes.io",
    role: "viewer",
    invitedAt: "5d ago",
  },
];

export const DEFAULT_INVITE_LINK: InviteLink = {
  url: "https://app.northwind.studio/join/k7Qm-29xa",
  role: "member",
  enabled: true,
  expiresLabel: "Expires in 7 days",
};

export const DEFAULT_SEAT_LIMIT = 10;
