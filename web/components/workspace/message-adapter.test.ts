import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendTurn,
  messagesUpTo,
  newReply,
  threadFrom,
} from "@/components/arc/blocks/ai-chat/chat-state";
import {
  contextToAttachments,
  toChatMessages,
  toStoredMessages,
} from "./message-adapter";
import type { Message, MessageContext } from "./types";

const snapshot: MessageContext = {
  id: "knowledge-1",
  name: "Design",
  kind: "knowledge",
  content: "Original content",
  url: "https://example.test/original",
};

test("knowledge snapshots survive another turn and persisted history reload", () => {
  const original: Message[] = [
    { id: 1, role: "user", content: "Read this", context: [snapshot] },
  ];
  let thread = threadFrom(toChatMessages(original, "test"), "test", "initial");
  const updatedSnapshot = {
    ...snapshot,
    content: "Updated content",
    url: "https://example.test/updated",
  };
  thread = appendTurn(thread, {
    id: "next",
    active: 0,
    versions: [{
      id: "next-user",
      prompt: "Read the update",
      attachments: contextToAttachments([updatedSnapshot]),
      reply: newReply("next-reply", "test"),
      next: null,
    }],
  });
  const stored = toStoredMessages(messagesUpTo(thread, "next"), "test");
  const reloaded: Message[] = JSON.parse(JSON.stringify(stored));
  const users = reloaded.filter((message) => message.role === "user");
  assert.deepEqual(
    users.map((message) => message.context),
    [[snapshot], [updatedSnapshot]],
  );
  const restored = threadFrom(toChatMessages(reloaded, "test"), "test", "restored");
  assert.deepEqual(
    toStoredMessages(messagesUpTo(restored, "restored-t1"), "test")
      .filter((message) => message.role === "user")
      .map((message) => message.context),
    [[snapshot], [updatedSnapshot]],
  );
});
