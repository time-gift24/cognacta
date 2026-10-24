export type SupportDay = {
  date: string;
  received: number;
  resolved: number;
  replyMinutes: number;
  onTime: number;
  responses: number;
  ratingTotal: number;
  ratings: number;
};

export type SupportTicket = {
  id: string;
  subject: string;
  customer: string;
  owner: string;
  priority: "high" | "medium" | "low";
  status: "in-review" | "in-progress" | "waiting" | "resolved";
  createdAt: string;
  dueAt: string;
  description: string;
};

export type SupportActivity = {
  id: string;
  type: "ticket" | "customer" | "assignment" | "alert" | "knowledge";
  title: string;
  description: string;
  at: string;
};

export type SupportDashboardData = {
  days: readonly SupportDay[];
  tickets: readonly SupportTicket[];
  activities: readonly SupportActivity[];
  /** A fixed reference for SLA time remaining; pass a fresh timestamp with live data. */
  asOf: string;
};

export const SUPPORT_SAMPLE_DATA: SupportDashboardData = {
  asOf: "2026-09-30T11:30:00Z",
  days: Array.from({ length: 92 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 6, 1 + i));
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const received = Math.round(
      (weekend ? 73 : 153) + Math.sin(i * 1.7) * 27 + i * 0.25,
    );
    const resolved = Math.round(received * (0.87 + (i % 5) * 0.045));
    const ratings = Math.round(resolved * 0.26);
    return {
      date: date.toISOString().slice(0, 10),
      received,
      resolved,
      replyMinutes: 18 + (i % 9),
      onTime: Math.round(resolved * (0.91 + (i % 4) * 0.017)),
      responses: resolved,
      ratingTotal: ratings * (4.5 + (i % 4) * 0.1),
      ratings,
    };
  }),
  tickets: Array.from({ length: 30 }, (_, i) => {
    const subjects = [
      "Seat count did not update",
      "Shared inbox is not appearing",
      "Weekly digest has incorrect totals",
      "Verification link has expired",
      "Notifications are arriving twice",
      "Question about storage allowance",
    ];
    const customers = [
      "Brightside",
      "Fieldnote",
      "Tandem",
      "Harbor",
      "Looma",
      "Juniper",
    ];
    const owners = ["Nina Patel", "Owen Reed", "Avery Brooks", "Theo Park"];
    const descriptions = [
      "Brightside added four seats, but their account still shows the previous allowance. Compare the latest invoice with the workspace member count before confirming the adjustment.",
      "Fieldnote's new team can sign in, but the shared inbox is missing from navigation. Check the team's inbox permissions and send the account lead the access steps.",
      "Tandem's weekly email shows fewer conversations than the saved dashboard report. Compare their reporting dates and time zone, then confirm which totals should appear in the digest.",
      "Harbor's verification email arrived after its sign-in link expired. Send a fresh link and confirm access with their workspace administrator.",
      "Looma receives two notifications for the same reply. Check the delivery IDs and subscription settings before updating the account's notification preferences.",
      "Juniper wants to understand which archived files count toward storage. Review their allowance and share a breakdown of active and archived uploads.",
    ];
    const statuses: SupportTicket["status"][] = [
      "in-review",
      "in-progress",
      "waiting",
      "resolved",
    ];
    const priorities: SupportTicket["priority"][] = ["high", "medium", "low"];
    const createdAt = new Date(
      Date.UTC(2026, 8, 30 - Math.floor(i / 3), 8, 15 + i),
    ).toISOString();
    return {
      id: `RQ-${5101 + i}`,
      subject: subjects[i % subjects.length],
      customer: customers[i % customers.length],
      owner: owners[i % owners.length],
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      createdAt,
      dueAt: new Date(
        Date.UTC(2026, 8, 30, 11, 30 + [120, 45, 1440, 360, -25, 180][i % 6]),
      ).toISOString(),
      description: descriptions[i % descriptions.length],
    };
  }),
  activities: [
    {
      id: "a1",
      type: "ticket",
      title: "Seat adjustment verified",
      description:
        "Nina compared Brightside's invoice with their member count. RQ-5101 is ready for the account lead to review.",
      at: "2026-09-30T11:20:00Z",
    },
    {
      id: "a2",
      type: "customer",
      title: "Fieldnote setup completed",
      description:
        "Owen confirmed Fieldnote's inbox permissions and routing preferences. Their team can now work from the shared queue.",
      at: "2026-09-30T11:15:00Z",
    },
    {
      id: "a3",
      type: "assignment",
      title: "Digest check handed to Avery",
      description:
        "Avery is comparing Tandem's weekly digest with the reporting dates on RQ-5103.",
      at: "2026-09-30T11:00:00Z",
    },
    {
      id: "a4",
      type: "alert",
      title: "First reply due soon",
      description:
        "Fieldnote is waiting on RQ-5102. Send the account lead an update within the next 45 minutes.",
      at: "2026-09-30T10:45:00Z",
    },
    {
      id: "a5",
      type: "knowledge",
      title: "Inbox access guide added",
      description:
        "The team documented how to check shared inbox permissions, invite members, and confirm routing.",
      at: "2026-09-30T10:30:00Z",
    },
    {
      id: "a6",
      type: "ticket",
      title: "Storage allowance clarified",
      description:
        "Theo shared Juniper's storage breakdown and closed RQ-5112 after the account lead confirmed the figures.",
      at: "2026-09-29T16:10:00Z",
    },
    {
      id: "a7",
      type: "customer",
      title: "Harbor workspace reviewed",
      description:
        "Nina checked Harbor's identity settings and recorded the next steps for the workspace handoff.",
      at: "2026-09-28T14:00:00Z",
    },
    {
      id: "a8",
      type: "knowledge",
      title: "Notification checklist revised",
      description:
        "The delivery guide now explains how to compare notification IDs and identify duplicate subscriptions.",
      at: "2026-09-25T09:10:00Z",
    },
    {
      id: "a9",
      type: "knowledge",
      title: "Saved reply refreshed",
      description:
        "The account access reply now includes a fresh sign-in link and a short checklist for workspace administrators.",
      at: "2026-09-22T15:40:00Z",
    },
  ],
};

export function supportDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}

export function supportCsv(tickets: readonly SupportTicket[]) {
  const cell = (value: string) =>
    `"${(/^[=+@\-\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  return [
    [
      "Request",
      "Subject",
      "Account",
      "Assigned to",
      "Priority",
      "Stage",
      "Opened",
      "Reply by",
    ],
    ...tickets.map((ticket) => [
      ticket.id,
      ticket.subject,
      ticket.customer,
      ticket.owner,
      ticket.priority,
      ticket.status,
      ticket.createdAt,
      ticket.dueAt,
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}

export function downloadSupportCsv(
  tickets: readonly SupportTicket[],
  name: string,
) {
  const url = URL.createObjectURL(
    new Blob([supportCsv(tickets)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
