"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { cn } from "@/lib/beui/utils";
import type { BeforeAfterScene } from "./before-after-data";

export function SceneTabs({
  scenes,
  value,
  onValueChange,
  label,
  className,
}: {
  scenes: readonly BeforeAfterScene[];
  value: string;
  onValueChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList aria-label={label} className={cn("w-full *:flex-1 sm:w-auto")}>
        {scenes.map((scene) => (
          <TabsTrigger key={scene.id} value={scene.id} className="w-full">
            {scene.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
