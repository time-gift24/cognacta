"use client";

import { useCallback, useMemo, useState } from "react";
import { type EmailChipData, mergeChips, splitEmails } from "./parse-emails";

export type ChipShake = { id: string; nonce: number };

/**
 * Owns the batch of email chips: the draft text, committing drafts and
 * pasted lists into chips, removing chips, and flagging duplicates so the
 * matching chip can shake.
 */
export function useEmailChips(taken: ReadonlySet<string>) {
  const [chips, setChips] = useState<EmailChipData[]>([]);
  const [draft, setDraft] = useState("");
  const [shake, setShake] = useState<ChipShake | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const add = useCallback(
    (entries: readonly string[]) => {
      if (entries.length === 0) return;
      const result = mergeChips(chips, entries, taken);
      const duplicate = result.duplicates.at(-1);
      if (duplicate) {
        setShake((prev) => ({
          id: duplicate.id,
          nonce: (prev?.nonce ?? 0) + 1,
        }));
      }
      setNotice(duplicate ? duplicate.email : null);
      setChips(result.chips);
    },
    [chips, taken],
  );

  const commitDraft = useCallback(() => {
    const entries = splitEmails(draft);
    if (entries.length === 0) return;
    add(entries);
    setDraft("");
  }, [add, draft]);

  const remove = useCallback((id: string) => {
    setChips((current) => current.filter((chip) => chip.id !== id));
    setNotice(null);
  }, []);

  const removeLast = useCallback(() => {
    setChips((current) => current.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setChips([]);
    setDraft("");
    setNotice(null);
  }, []);

  const valid = useMemo(() => chips.filter((chip) => !chip.error), [chips]);
  const invalid = useMemo(() => chips.filter((chip) => chip.error), [chips]);

  return {
    chips,
    valid,
    invalid,
    draft,
    setDraft,
    shake,
    duplicateNotice: notice,
    add,
    commitDraft,
    remove,
    removeLast,
    clear,
  };
}
