import { cn } from "@/lib/beui/utils";
import { initialsFor } from "./parse-emails";

export type TeamAvatarProps = {
  /** Name or email, used for alt text and initials. */
  label: string;
  src?: string;
  online?: boolean;
  className?: string;
};

/** Photo avatar for known people, initials for addresses we do not know. */
export function TeamAvatar({ label, src, online, className }: TeamAvatarProps) {
  return (
    <span className={cn("relative inline-flex size-9 shrink-0", className)}>
      {src ? (
        // biome-ignore lint/performance/noImgElement: remote Unsplash portraits are sample data and stay framework-agnostic for installs.
        <img
          src={src}
          alt={label}
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          className="size-full rounded-full border border-border object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-full place-items-center rounded-full border border-border bg-muted font-medium font-mono text-muted-foreground text-xs"
        >
          {initialsFor(label)}
        </span>
      )}
      {online ? (
        <span
          aria-hidden
          className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background bg-emerald-500"
        />
      ) : null}
    </span>
  );
}
