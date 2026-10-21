import { cn } from "@/lib/beui/utils";

/** Static decorative art keeps feature previews free of background render loops. */
export function FeatureArtwork({
  src,
  className,
  position = "center",
}: {
  src: string;
  className?: string;
  position?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* biome-ignore lint/performance/noImgElement: portable registry artwork, already optimized and lazy loaded */}
      <img
        src={src}
        alt=""
        width={768}
        height={768}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
        style={{ objectPosition: position }}
      />
      <div className="absolute inset-0 bg-background/10 dark:bg-background/65" />
    </div>
  );
}
