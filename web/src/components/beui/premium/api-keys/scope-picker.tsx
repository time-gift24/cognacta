"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { ApiKeyScopeGroup } from "./api-keys-data";

/**
 * Applies a scope toggle within its group. The first scope in a group is the
 * base (usually read): granting any other scope grants it too, and removing
 * it removes the rest of the group.
 */
export function toggleScope(
  selected: readonly string[],
  group: ApiKeyScopeGroup,
  scopeId: string,
  checked: boolean,
) {
  const next = new Set(selected);
  const base = group.scopes[0]?.id;
  if (checked) {
    next.add(scopeId);
    if (base) next.add(base);
  } else if (scopeId === base) {
    for (const scope of group.scopes) next.delete(scope.id);
  } else {
    next.delete(scopeId);
  }
  return [...next];
}

export function ScopePicker({
  groups,
  selected,
  onChange,
  legend,
  error,
  disabled,
}: {
  groups: readonly ApiKeyScopeGroup[];
  selected: readonly string[];
  onChange: (scopes: string[]) => void;
  legend: string;
  error?: string | null;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <fieldset aria-describedby={error ? "api-keys-scope-error" : undefined}>
      <legend className="px-1 font-medium text-foreground text-sm">
        {legend}
      </legend>
      <ul
        className={cn(
          "mt-1.5 divide-y divide-border rounded-2xl border transition-colors duration-200",
          error ? "border-destructive" : "border-border",
        )}
      >
        {groups.map((group) => (
          <li
            key={group.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="min-w-0">
              <span className="block font-medium text-sm">{group.label}</span>
              {group.description ? (
                <span className="block truncate text-muted-foreground text-xs">
                  {group.description}
                </span>
              ) : null}
            </span>
            <span className="flex shrink-0 items-center gap-4">
              {group.scopes.map((scope) => (
                <Checkbox
                  key={scope.id}
                  label={scope.label}
                  aria-label={`${group.label} ${scope.label.toLowerCase()}`}
                  checked={selected.includes(scope.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    onChange(toggleScope(selected, group, scope.id, checked))
                  }
                  className="min-h-10 gap-2"
                />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            id="api-keys-scope-error"
            role="alert"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="mt-1.5 px-1 text-destructive text-xs"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </fieldset>
  );
}
