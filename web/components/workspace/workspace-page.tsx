"use client";

import Link from "next/link";
import { useState } from "react";
import { useSessions } from "./session-provider";
import { Conversation } from "./conversation";
import { EmptyWorkspace } from "./empty-workspace";
import type { MessageContext } from "./types";

export function WorkspacePage({ sessionId }: { sessionId?: string }) {
  const store = useSessions();
  const [value, setValue] = useState("");
  const session = store.sessions.find((item) => item.id === sessionId);

  if (!store.ready)
    return (
      <p role="status" className="p-16 text-sm text-muted-foreground">
        Loading workspace…
      </p>
    );
  if (sessionId && !session)
    return (
      <div className="grid h-full place-content-center gap-3 text-center">
        <h1 className="text-xl font-medium">Chat not found</h1>
        <p className="text-sm text-muted-foreground">
          This chat may have been deleted or belongs to another browser.
        </p>
        <Link href="/" className="text-sm text-primary underline">
          Start a new chat
        </Link>
      </div>
    );

  const onSubmit = (text: string, context?: MessageContext[]) => {
    store.send(sessionId, text, context);
    setValue("");
  };
  const composerProps = {
    value,
    setValue,
    onSubmit,
    onStop: () => {
      if (sessionId) store.stop(sessionId);
    },
    thinking: Boolean(sessionId && store.pending.includes(sessionId)),
    model: store.model,
    setModel: store.setModel,
    webEnabled: store.webEnabled,
    setWebEnabled: store.setWebEnabled,
  };
  return session ? (
    <Conversation
      key={session.id}
      title={session.title}
      messages={session.messages}
      {...composerProps}
    />
  ) : (
    <EmptyWorkspace onStarterClick={onSubmit} {...composerProps} />
  );
}
