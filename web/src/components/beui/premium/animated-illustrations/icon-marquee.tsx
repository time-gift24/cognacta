"use client";

import {
  Bell,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  Cloud,
  Database,
  FileText,
  Globe2,
  type LucideIcon,
  MessageSquareText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/beui/utils";

type MarqueeIcon = {
  name: string;
  icon: LucideIcon;
  className: string;
};

const topRow: MarqueeIcon[] = [
  { name: "Search", icon: Search, className: "text-blue-600" },
  { name: "Document", icon: FileText, className: "text-amber-600" },
  { name: "Messages", icon: MessageSquareText, className: "text-emerald-600" },
  { name: "Modules", icon: Boxes, className: "text-violet-600" },
  { name: "Database", icon: Database, className: "text-cyan-600" },
  { name: "Security", icon: ShieldCheck, className: "text-rose-600" },
  { name: "Calendar", icon: CalendarDays, className: "text-orange-600" },
  { name: "Notifications", icon: Bell, className: "text-indigo-600" },
];

const bottomRow: MarqueeIcon[] = [
  {
    name: "Analytics",
    icon: ChartNoAxesCombined,
    className: "text-violet-600",
  },
  { name: "AI", icon: Sparkles, className: "text-blue-600" },
  { name: "Cloud", icon: Cloud, className: "text-cyan-600" },
  { name: "Payments", icon: WalletCards, className: "text-emerald-600" },
  { name: "Team", icon: Users, className: "text-orange-600" },
  { name: "Automation", icon: Zap, className: "text-amber-600" },
  { name: "Global", icon: Globe2, className: "text-rose-600" },
  { name: "Settings", icon: Settings2, className: "text-indigo-600" },
];

export type IconMarqueeLayout = "default" | "card";

export type IconMarqueeProps = {
  className?: string;
  layout?: IconMarqueeLayout;
  title?: string;
};

type MarqueeRowProps = {
  direction: "left" | "right";
  icons: MarqueeIcon[];
  layout: IconMarqueeLayout;
};

function MarqueeRow({ direction, icons, layout }: MarqueeRowProps) {
  return (
    <div className="icon-marquee__viewport w-full overflow-hidden">
      <div
        data-direction={direction}
        className="icon-marquee__track flex w-max"
      >
        {["first", "second"].map((group) => (
          <div
            key={group}
            className={cn(
              "flex shrink-0",
              layout === "card" ? "gap-2 pr-2" : "gap-3 pr-3",
            )}
          >
            {icons.map((item) => {
              const Icon = item.icon;

              return (
                <span
                  key={`${group}-${item.name}`}
                  className={cn(
                    "grid shrink-0 place-items-center rounded-xl border border-border bg-background",
                    layout === "card" ? "size-11" : "size-16",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      item.className,
                      layout === "card" ? "size-4.5" : "size-6",
                    )}
                    strokeWidth={1.7}
                  />
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function IconMarquee({
  className,
  layout = "default",
  title = "Two rows of icon cards moving continuously in opposite directions",
}: IconMarqueeProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "icon-marquee relative isolate flex aspect-[4/3] w-full items-center overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex w-full flex-col",
          layout === "card" ? "gap-2.5" : "gap-4",
        )}
      >
        <MarqueeRow direction="left" icons={topRow} layout={layout} />
        <MarqueeRow direction="right" icons={bottomRow} layout={layout} />
      </div>

      <style>{`
        .icon-marquee .icon-marquee__viewport {
          -webkit-mask-image: linear-gradient(
            to right,
            transparent,
            black 12%,
            black 88%,
            transparent
          );
          mask-image: linear-gradient(
            to right,
            transparent,
            black 12%,
            black 88%,
            transparent
          );
        }

        .icon-marquee .icon-marquee__track[data-direction="left"] {
          animation: icon-marquee-left 20s linear infinite;
          will-change: transform;
        }

        .icon-marquee .icon-marquee__track[data-direction="right"] {
          animation: icon-marquee-right 22s linear infinite;
          will-change: transform;
        }

        @keyframes icon-marquee-left {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @keyframes icon-marquee-right {
          from {
            transform: translate3d(-50%, 0, 0);
          }
          to {
            transform: translate3d(0, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .icon-marquee .icon-marquee__track[data-direction] {
            animation: none;
          }

          .icon-marquee .icon-marquee__track[data-direction="right"] {
            transform: translate3d(-18%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
