"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";

/** Period switcher for wallet charts with roving arrow-key focus. */
export function CryptoRangeTabs({
  id,
  ranges,
  value,
  onValueChange,
  label,
  controls,
}: {
  id: string;
  ranges: readonly string[];
  value: string;
  onValueChange: (range: string) => void;
  label: string;
  /** Id of the panel these tabs control. */
  controls: string;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} variant="pill">
      <TabsList aria-label={label}>
        {ranges.map((item, index) => (
          <TabsTrigger
            key={item}
            value={item}
            id={`${id}-range-${index}`}
            aria-controls={controls}
            tabIndex={value === item ? 0 : -1}
            className="h-8 rounded-full px-3 text-xs"
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight")
                next = (index + 1) % ranges.length;
              else if (event.key === "ArrowLeft")
                next = (index - 1 + ranges.length) % ranges.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = ranges.length - 1;
              else return;
              event.preventDefault();
              onValueChange(ranges[next]);
              document.getElementById(`${id}-range-${next}`)?.focus();
            }}
          >
            {item}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
