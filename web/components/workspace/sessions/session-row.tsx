"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Session } from "../types";
import { SessionActions } from "./session-actions";

export function SessionRow({
  session,
  active,
  onNavigate,
}: {
  session: Session;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <div
      className={cn(
        "group/recent relative flex h-8 w-full items-center rounded-md text-[12px] transition-colors [@media(pointer:coarse)]:h-10 hover:bg-surface-active focus-within:bg-surface-active",
        active
          ? "bg-surface-active text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Link
        href={`/chat/${session.id}`}
        onClick={(event) => {
          if (
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey
          ) {
            event.preventDefault();
            onNavigate();
          }
        }}
        title={session.title}
        aria-current={active ? "page" : undefined}
        className="flex h-full min-w-0 flex-1 items-center rounded-md px-3 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="truncate">{session.title}</span>
      </Link>
      <div
        className={cn(
          "absolute right-0 flex h-full items-center rounded-r-md",
          active ? "bg-surface-active" : "bg-surface",
          "group-hover/recent:bg-surface-active group-focus-within/recent:bg-surface-active",
          "opacity-0 pointer-events-none group-hover/recent:opacity-100 group-hover/recent:pointer-events-auto group-focus-within/recent:opacity-100 group-focus-within/recent:pointer-events-auto",
          "has-[[data-state=open]]:opacity-100 has-[[data-state=open]]:pointer-events-auto",
          "[@media(hover:none)]:static [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto transition-opacity duration-150 motion-reduce:transition-none",
        )}
      >
        <SessionActions session={session} active={active} />
      </div>
    </div>
  );
}
