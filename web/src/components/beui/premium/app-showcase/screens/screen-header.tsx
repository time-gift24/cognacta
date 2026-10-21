import type { ReactNode } from "react";

/** Eyebrow and title at the top of a phone screen. */
export function ScreenHeader({
  eyebrow,
  title,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="pt-2 pb-4">
      <p className="text-muted-foreground text-xs">{eyebrow}</p>
      <p className="mt-1 font-medium text-xl">{title}</p>
    </div>
  );
}
