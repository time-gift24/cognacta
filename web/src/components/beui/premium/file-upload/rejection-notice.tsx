"use client";

import { CircleAlert } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_IN, EASE_OUT } from "@/lib/beui/ease";

/** Files skipped on drop, browse, or paste. Clears itself after a moment. */
export function RejectionNotice({
  entries,
}: {
  entries: { id: string; name: string; reason: string }[];
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {entries.length > 0 ? (
        <motion.ul
          key={entries[0]?.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.25, ease: EASE_OUT },
          }}
          exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_IN } }}
          className="mt-2 flex flex-col gap-1 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3"
        >
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex min-w-0 items-center gap-2 text-amber-700 text-xs dark:text-amber-300"
            >
              <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">
                <span className="font-medium">{entry.name}</span>
                {" · "}
                {entry.reason}
              </span>
            </li>
          ))}
        </motion.ul>
      ) : null}
    </AnimatePresence>
  );
}
