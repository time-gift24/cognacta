"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { SPRING_PANEL } from "@/lib/beui/ease";
import type { DocsArticleLabels, DocsFeedbackValue } from "./docs-data";

/* ─────────────────────────────────────────────────────────
 * FEEDBACK
 *
 *  ask      question and Yes / No buttons rise in
 *  answer   the row lifts out and a thank-you note rises in
 *  reduced  the swap is an instant fade
 * ───────────────────────────────────────────────────────── */
export type DocsFeedbackProps = {
  labels: Pick<
    DocsArticleLabels,
    | "feedbackQuestion"
    | "feedbackYes"
    | "feedbackNo"
    | "feedbackThanksYes"
    | "feedbackThanksNo"
  >;
  onFeedback?: (value: DocsFeedbackValue) => void;
};

export function DocsFeedback({ labels, onFeedback }: DocsFeedbackProps) {
  const reduce = useReducedMotion();
  const [feedback, setFeedback] = useState<DocsFeedbackValue | null>(null);

  const answer = (value: DocsFeedbackValue) => {
    setFeedback(value);
    onFeedback?.(value);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {feedback === null ? (
        <motion.div
          key="ask"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={reduce ? { duration: 0 } : SPRING_PANEL}
          className="flex items-center gap-3"
        >
          <p className="text-muted-foreground text-sm">
            {labels.feedbackQuestion}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => answer("yes")}
          >
            <ThumbsUp className="size-3.5" aria-hidden="true" />
            {labels.feedbackYes}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => answer("no")}
          >
            <ThumbsDown className="size-3.5" aria-hidden="true" />
            {labels.feedbackNo}
          </Button>
        </motion.div>
      ) : (
        <motion.p
          key="thanks"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : SPRING_PANEL}
          className="text-sm"
          aria-live="polite"
        >
          {feedback === "yes"
            ? labels.feedbackThanksYes
            : labels.feedbackThanksNo}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
