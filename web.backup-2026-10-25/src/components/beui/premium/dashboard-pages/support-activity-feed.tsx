"use client";

import {
  BookOpen,
  Building2,
  CircleAlert,
  Inbox,
  List,
  Search,
  Users,
} from "lucide-react";
import { useId, useState } from "react";
import { BouncyAccordion } from "@/components/beui/motion/bouncy-accordion";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { type SupportActivity, supportDate } from "./support-dashboard-data";

const ICONS = {
  ticket: Inbox,
  customer: Building2,
  assignment: Users,
  alert: CircleAlert,
  knowledge: BookOpen,
};

export function SupportActivityFeed({
  activities,
}: {
  activities: readonly SupportActivity[];
}) {
  const heading = useId();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const normalized = query.trim().toLowerCase();
  const filtered = [...activities]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((activity) =>
      `${activity.title} ${activity.description}`
        .toLowerCase()
        .includes(normalized),
    );
  const visible = showAll || normalized ? filtered : filtered.slice(0, 5);

  return (
    <section
      aria-labelledby={heading}
      className="flex min-w-0 flex-col rounded-2xl border border-border bg-background p-5 sm:p-6 @5xl/dashboard:h-128"
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h2
          id={heading}
          className="flex items-center gap-2 text-xl font-medium"
        >
          <List aria-hidden className="size-4 text-muted-foreground" />
          Team signals
        </h2>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
          {activities.length}
        </span>
      </div>
      <Input
        leftIcon={<Search aria-hidden className="size-4" />}
        aria-label="Search team updates"
        value={query}
        onChange={(event) => setQuery(event)}
        placeholder="Find an update…"
        className="w-full min-w-0 flex-1 mt-5 shrink-0"
        classNames={{ input: "text-sm placeholder:text-muted-foreground" }}
      />
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {visible.length ? (
          <BouncyAccordion
            items={visible.map((activity) => {
              const Icon = ICONS[activity.type];
              return {
                id: activity.id,
                title: (
                  <span className="block">
                    <span className="block text-sm font-normal">
                      {activity.title}
                    </span>
                    <time
                      dateTime={activity.at}
                      className="mt-1 block text-xs font-normal text-muted-foreground"
                    >
                      {supportDate(activity.at, true)}
                    </time>
                  </span>
                ),
                icon: <Icon aria-hidden className="size-4" />,
                description: activity.description,
              };
            })}
            classNames={{
              item: "bg-background",
              trigger:
                "min-h-16 gap-3 px-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              icon: "size-8 rounded-full bg-muted",
              title: "text-sm",
              description: "text-xs leading-5",
              chevron: "size-4",
            }}
          />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No updates here yet. Try another search or date range.
          </p>
        )}
      </div>
      {filtered.length > 5 && !normalized && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full shrink-0 rounded-full text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show less" : `View all ${filtered.length} updates`}
        </Button>
      )}
    </section>
  );
}
