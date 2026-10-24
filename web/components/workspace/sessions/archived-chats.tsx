"use client";

import Link from "next/link";
import { Input } from "@/components/form-fields";
import { useState } from "react";
import { Archive, Search } from "@/components/icons";
import { useSessions } from "../session-provider";
import { SessionActions } from "./session-actions";

export function ArchivedChats() {
  const { sessions, ready } = useSessions();
  const [query, setQuery] = useState("");
  const archived = sessions.filter(
    (session) =>
      session.archived &&
      session.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-20 pb-10 sm:px-8 lg:pt-12">
      <h1 className="text-2xl font-semibold tracking-tight">Archived chats</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Out of the sidebar, here when you need them.
      </p>
      <label className="relative mt-8 block max-w-sm">
        <span className="sr-only">Search archived chats</span>
        <Search className="absolute top-3 left-3.5 size-4 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search archived chats"
          className="h-10 rounded-full pl-10"
        />
      </label>
      <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {archived.map((session) => (
          <div key={session.id} className="flex items-center gap-3 p-4">
            <Archive className="size-4 text-muted-foreground" />
            <Link
              className="min-w-0 flex-1 truncate rounded text-sm hover:underline focus-visible:outline-2 focus-visible:outline-primary"
              href={`/chat/${session.id}`}
            >
              {session.title}
            </Link>
            <SessionActions session={session} active={false} />
          </div>
        ))}
        {!archived.length && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {!ready
              ? "Loading chats…"
              : query
                ? "No matching archived chats."
                : "No archived chats yet."}
          </p>
        )}
      </div>
    </div>
  );
}
