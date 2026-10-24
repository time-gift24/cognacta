"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSessions } from "./session-provider";
import { Conversation } from "./conversation";
import { EmptyWorkspace } from "./empty-workspace";
import type { MessageContext } from "./types";

export function WorkspacePage({ sessionId }: { sessionId?: string }) {
  const store = useSessions();
  const t = useTranslations("Chat");
  const [value, setValue] = useState("");
  const session = store.sessions.find((item) => item.id === sessionId);

  if (!store.ready)
    return (
      <p role="status" className="p-16 text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );
  if (sessionId && !session)
    return (
      <div className="grid h-full place-content-center gap-3 text-center">
        <h1 className="text-xl font-medium">{t("notFound")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("notFoundHint")}
        </p>
        <Link href="/" className="text-sm text-primary underline">
          {t("startNew")}
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
