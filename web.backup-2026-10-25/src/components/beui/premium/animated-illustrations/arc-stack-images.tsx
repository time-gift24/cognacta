"use client";

import { ArcStack, type ArcStackLayout } from "./arc-stack";

const images = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=82",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=82",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=82",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=82",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=82",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=82",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=82",
] as const;

export type ArcStackImagesProps = {
  className?: string;
  layout?: ArcStackLayout;
  title?: string;
};

export function ArcStackImages({
  className,
  layout = "default",
  title = "Portrait cards rolling through a semicircular stack",
}: ArcStackImagesProps) {
  const items = images.map((src) => ({
    id: src,
    content: (
      // biome-ignore lint/performance/noImgElement: remote artwork keeps the installable illustration framework-agnostic.
      <img
        src={src}
        alt=""
        className="size-full object-cover"
        draggable={false}
      />
    ),
  }));

  return (
    <ArcStack
      className={className}
      items={items}
      layout={layout}
      title={title}
    />
  );
}
