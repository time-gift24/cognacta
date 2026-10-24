"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";

const HOLD_KEYS = new Set([" ", "Enter"]);

/** Momentary control: shows the full "before" frame while pressed. */
export function HoldButton({
  label,
  onHold,
  className,
}: {
  label: string;
  onHold: (active: boolean) => void;
  className?: string;
}) {
  const [held, setHeld] = useState(false);
  const set = (active: boolean) => {
    setHeld(active);
    onHold(active);
  };
  return (
    <Button
      type="button"
      variant="secondary"
      aria-pressed={held}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => held && set(false)}
      onKeyDown={(event) => {
        if (!HOLD_KEYS.has(event.key)) return;
        event.preventDefault();
        if (!event.repeat) set(true);
      }}
      onKeyUp={(event) => {
        if (HOLD_KEYS.has(event.key)) set(false);
      }}
      onBlur={() => held && set(false)}
      onContextMenu={(event) => event.preventDefault()}
      className={cn("w-full touch-none select-none", className)}
    >
      <Eye className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
