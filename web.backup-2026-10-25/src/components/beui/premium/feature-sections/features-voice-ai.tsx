"use client";

import {
  AudioLines,
  CalendarDays,
  Database,
  Headphones,
  MessageSquareText,
  Mic,
  PhoneCall,
  PhoneOff,
  UserRound,
} from "lucide-react";
import {
  motion,
  useInView,
  usePageInView,
  useReducedMotion,
} from "motion/react";
import { useRef } from "react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FeatureArtwork } from "./feature-artwork";

export type FeaturesVoiceAIProps = {
  eyebrow?: string;
  title?: readonly [string, string];
  subtext?: string;
  backgroundImage?: string;
  className?: string;
};

const VOICE_BARS = [
  ["a", 12],
  ["b", 24],
  ["c", 38],
  ["d", 20],
  ["e", 46],
  ["f", 30],
  ["g", 52],
  ["h", 36],
  ["i", 22],
  ["j", 42],
  ["k", 28],
  ["l", 16],
] as const;

const TRANSCRIPT = [
  {
    id: "caller",
    speaker: "Caller",
    text: "Can I move tomorrow’s delivery to Friday morning?",
    time: "00:08",
  },
  {
    id: "aria",
    speaker: "Aria",
    text: "Friday morning is available. I can update it now.",
    time: "00:11",
  },
] as const;

const CONNECTED_TOOLS = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "crm", label: "CRM", icon: Database },
  { id: "support", label: "Support", icon: Headphones },
] as const;

export function FeaturesVoiceAI({
  eyebrow = "AI voice, built for service",
  title = ["Every call answered.", "Every task moving."],
  subtext = "Natural conversations, clear summaries, and actions that carry into the tools your team already uses.",
  backgroundImage = "https://pro.beui.dev/features/ink-waves.webp",
  className,
}: FeaturesVoiceAIProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;
  const inView = useInView(sectionRef, { margin: "-15% 0px" });
  const pageInView = usePageInView();
  const live = !reduce && inView && pageInView;

  return (
    <section
      ref={sectionRef}
      className={cn("w-full bg-background px-4 py-20 sm:px-8", className)}
    >
      <div className="mx-auto w-full max-w-6xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-muted-foreground text-sm">{eyebrow}</p>
          <h2 className="mt-4 font-sans font-medium text-4xl text-foreground leading-none tracking-tight">
            <span className="block">{title[0]}</span>{" "}
            <span className="block">{title[1]}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground text-sm leading-7">
            {subtext}
          </p>
        </header>

        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          <FeatureCard
            reduce={reduce}
            index={0}
            className="min-h-[22rem] bg-foreground text-background lg:col-span-5"
          >
            <AlwaysAvailable />
          </FeatureCard>

          <FeatureCard
            reduce={reduce}
            index={1}
            className="min-h-[22rem] bg-background p-0 sm:p-0 lg:col-span-7"
          >
            <NaturalConversation
              live={live}
              backgroundImage={backgroundImage}
            />
          </FeatureCard>

          <FeatureCard
            reduce={reduce}
            index={2}
            className="min-h-[24rem] bg-muted/50 lg:col-span-6"
          >
            <CallUnderstanding live={live} />
          </FeatureCard>

          <FeatureCard
            reduce={reduce}
            index={3}
            className="min-h-[24rem] bg-muted/70 lg:col-span-6"
          >
            <ConnectedActions live={live} />
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  children,
  reduce,
  index,
  className,
}: {
  children: React.ReactNode;
  reduce: boolean;
  index: number;
  className?: string;
}) {
  const visible = {
    opacity: 1,
    transform: "translateY(0px)",
    filter: "blur(0px)",
  };

  return (
    <motion.article
      initial={
        reduce
          ? false
          : {
              opacity: 0,
              transform: "translateY(18px)",
              filter: "blur(6px)",
            }
      }
      animate={reduce ? visible : undefined}
      whileInView={reduce ? undefined : visible}
      viewport={{ once: true, margin: "-60px" }}
      transition={
        reduce
          ? undefined
          : { duration: 0.5, ease: EASE_OUT, delay: index * 0.07 }
      }
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8",
        className,
      )}
    >
      {children}
    </motion.article>
  );
}

function AlwaysAvailable() {
  return (
    <div className="relative flex h-full min-h-[18rem] flex-col justify-end overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-2 select-none whitespace-nowrap text-left font-medium text-7xl text-background/10 leading-tight tracking-[-0.06em] sm:text-8xl"
      >
        VOICE
      </div>

      <div className="relative">
        <span className="grid size-12 place-items-center rounded-full bg-background/10 text-background">
          <PhoneCall className="size-5" />
        </span>
        <p className="mt-8 font-medium text-4xl leading-none tracking-tight">
          24/7
        </p>
        <h3 className="mt-4 font-medium text-xl">Always ready to answer</h3>
        <p className="mt-2 max-w-sm text-background/70 text-sm leading-6">
          One consistent voice across every hour, queue, and time zone.
        </p>
      </div>
    </div>
  );
}

function NaturalConversation({
  live,
  backgroundImage,
}: {
  live: boolean;
  backgroundImage: string;
}) {
  return (
    <div className="relative flex h-full min-h-[22rem] flex-col overflow-hidden p-6 sm:p-8">
      <FeatureArtwork
        src={backgroundImage}
        className="opacity-60 [mask-image:linear-gradient(to_left,black,transparent)]"
      />
      <div className="relative z-10 max-w-xs">
        <h3 className="font-medium text-foreground text-xl">
          Natural conversations
        </h3>
        <p className="mt-2 text-muted-foreground text-sm leading-6">
          Fast turn-taking and expressive speech keep every call moving.
        </p>
      </div>

      <div className="relative z-10 mt-8 flex flex-1 items-end justify-end sm:mt-2">
        <div className="relative mr-5 w-48 rounded-3xl border-4 border-foreground bg-background p-3 pb-5 sm:mr-8 sm:w-52">
          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span>9:41</span>
            <span>AI voice</span>
          </div>
          <div className="mt-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-foreground">
              <Mic className="size-5" />
            </span>
            <p className="mt-3 font-medium text-foreground text-sm">Aria</p>
            <p className="mt-1 text-muted-foreground text-xs">listening</p>
            <VoiceBars live={live} />
          </div>
          <div className="mt-4 flex justify-center">
            <span className="grid size-10 place-items-center rounded-full bg-foreground text-background">
              <PhoneOff className="size-4" />
            </span>
          </div>
        </div>

        <motion.div
          className="absolute right-28 bottom-12 flex min-w-52 items-center gap-3 rounded-full border border-border bg-background px-3 py-2.5 sm:right-40"
          animate={
            live
              ? {
                  transform: [
                    "translateY(0px)",
                    "translateY(-5px)",
                    "translateY(0px)",
                  ],
                }
              : undefined
          }
          transition={{ duration: 4.2, ease: EASE_IN_OUT, repeat: Infinity }}
        >
          <span className="grid size-8 place-items-center rounded-full bg-muted text-foreground">
            <AudioLines className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground text-xs">Live call</p>
            <p className="text-muted-foreground text-xs">00:18 · low latency</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function CallUnderstanding({ live }: { live: boolean }) {
  return (
    <div className="flex h-full min-h-[20rem] flex-col">
      <div>
        <h3 className="font-medium text-foreground text-xl">
          Every call, understood
        </h3>
        <p className="mt-2 max-w-md text-muted-foreground text-sm leading-6">
          The transcript, intent, and next step arrive together when the call
          ends.
        </p>
      </div>

      <div className="mt-8 flex-1 rounded-2xl border border-border bg-background p-4 sm:p-5">
        <div className="flex items-center justify-between border-border border-b pb-3">
          <div className="flex items-center gap-2 text-foreground text-xs">
            <MessageSquareText className="size-4" />
            Call transcript
          </div>
          <span className="font-mono text-muted-foreground text-xs">00:18</span>
        </div>

        <div className="divide-y divide-border">
          {TRANSCRIPT.map((turn, index) => (
            <motion.div
              key={turn.id}
              className="grid grid-cols-[3.5rem_1fr_auto] gap-3 py-3 text-xs"
              animate={
                live
                  ? { opacity: [0.55, 1, 0.55] }
                  : { opacity: index === 1 ? 1 : 0.7 }
              }
              transition={{
                duration: 4,
                ease: EASE_IN_OUT,
                repeat: Infinity,
                delay: index * 1.5,
              }}
            >
              <span className="text-muted-foreground">{turn.speaker}</span>
              <span className="text-foreground leading-5">{turn.text}</span>
              <span className="font-mono text-muted-foreground">
                {turn.time}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-background px-3 py-2.5 text-xs">
          <span className="text-foreground">Delivery moved to Friday</span>
          <span className="text-muted-foreground">ready</span>
        </div>
      </div>
    </div>
  );
}

function ConnectedActions({ live }: { live: boolean }) {
  return (
    <div className="flex h-full min-h-[20rem] flex-col">
      <div>
        <h3 className="font-medium text-foreground text-xl">
          Acts while it talks
        </h3>
        <p className="mt-2 max-w-md text-muted-foreground text-sm leading-6">
          Book, update, and hand off work without sending the caller somewhere
          else.
        </p>
      </div>

      <div className="relative mt-8 flex flex-1 items-center justify-center">
        <div className="absolute inset-x-[14%] top-1/2 h-px bg-border" />
        {CONNECTED_TOOLS.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              className={cn(
                "absolute z-10 flex flex-col items-center gap-2",
                index === 0 && "top-0 left-[13%]",
                index === 1 && "top-0 right-[13%]",
                index === 2 && "right-[8%] bottom-0",
              )}
              animate={
                live
                  ? {
                      transform: [
                        "translateY(0px)",
                        "translateY(-4px)",
                        "translateY(0px)",
                      ],
                    }
                  : undefined
              }
              transition={{
                duration: 4.6,
                ease: EASE_IN_OUT,
                repeat: Infinity,
                delay: index * 0.4,
              }}
            >
              <span className="grid size-11 place-items-center rounded-full border border-border bg-background text-foreground">
                <Icon className="size-4" />
              </span>
              <span className="text-muted-foreground text-xs">
                {tool.label}
              </span>
            </motion.div>
          );
        })}

        <div className="relative z-20 w-56 rounded-2xl bg-foreground p-5 text-background">
          <div className="flex items-center justify-between">
            <span className="grid size-9 place-items-center rounded-full bg-background/10">
              <UserRound className="size-4" />
            </span>
            <span className="font-mono text-background/60 text-xs">#1842</span>
          </div>
          <p className="mt-5 font-medium text-sm">Call completed</p>
          <p className="mt-1 text-background/65 text-xs leading-5">
            Delivery updated and confirmation sent.
          </p>
        </div>
      </div>
    </div>
  );
}

function VoiceBars({ live }: { live: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="mt-4 flex h-14 items-center justify-center gap-1"
    >
      {VOICE_BARS.map(([id, height], index) => (
        <motion.span
          key={id}
          className="w-1 rounded-full bg-foreground"
          style={{ height: height * 0.58 }}
          animate={
            live
              ? {
                  transform: ["scaleY(0.55)", "scaleY(1)", "scaleY(0.55)"],
                }
              : undefined
          }
          transition={{
            duration: 1.45 + (index % 4) * 0.17,
            ease: EASE_IN_OUT,
            repeat: Infinity,
            delay: index * 0.05,
          }}
        />
      ))}
    </div>
  );
}
