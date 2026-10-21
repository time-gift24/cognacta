"use client";

import {
  ArrowDown,
  ArrowUpRight,
  CheckCheck,
  FileText,
  MessageCircle,
  X,
} from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { ShaderBackground } from "@/components/beui/motion/shader-background";
import { TextReveal } from "@/components/beui/motion/text-reveal";
import { EASE_OUT } from "@/lib/beui/ease";
import { useDarkTheme } from "@/lib/beui/hooks/use-dark-theme";
import { cn } from "@/lib/beui/utils";
import { type AiHeroTeammate, DEMO_TEAM } from "./ai-teammates-data";
import { HERO_HEADING_CLASS } from "./hero-heading";
import { TeammateAvatar } from "./teammate-avatar";
import { TeammateDemo } from "./teammate-demo";

export type { AiHeroTeammate } from "./ai-teammates-data";

export type HeroAiTeammatesProps = {
  eyebrow?: string;
  titleStart?: string;
  titleEnd?: string;
  description?: string;
  teamName?: string;
  primaryLabel?: string;
  /** Connect the primary CTA to your own onboarding flow. Defaults to replaying the demo. */
  onPrimaryAction?: () => void;
  /** Supply at least one teammate, with unique IDs. */
  teammates?: readonly [AiHeroTeammate, ...AiHeroTeammate[]];
  /** Play the sample conversation when its viewport is visible. */
  autoPlay?: boolean;
  className?: string;
};

export function HeroAiTeammates({
  eyebrow = "A few extra minds on your team",
  titleStart = "Your new",
  titleEnd = "AI teammates",
  description = "Give each teammate a role, share what needs doing, and let them take it from there. They bring the finished work back to you.",
  teamName = "Sidekick",
  primaryLabel = "Meet your team",
  onPrimaryAction,
  teammates = DEMO_TEAM,
  autoPlay = true,
  className,
}: HeroAiTeammatesProps) {
  const reduce = useReducedMotion();
  const demoRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const [selectedId, setSelectedId] = useState(teammates[0].id);
  const [replay, setReplay] = useState(0);
  const [started, setStarted] = useState(autoPlay);
  const [documentOpen, setDocumentOpen] = useState(false);
  const teammate =
    teammates.find((item) => item.id === selectedId) ?? teammates[0];

  function replayDemo() {
    setStarted(true);
    setReplay((value) => value + 1);
  }

  function selectTeammate(id: string) {
    setSelectedId(id);
    replayDemo();
  }

  function startDemo() {
    replayDemo();
    demoRef.current?.scrollIntoView({
      behavior: reduce ? "instant" : "smooth",
      block: "center",
    });
  }

  const reveal = (delay: number) => ({
    initial: reduce ? (false as const) : { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: {
      duration: reduce ? 0 : 0.5,
      ease: EASE_OUT,
      delay: reduce ? 0 : delay,
    },
  });

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "relative isolate w-full overflow-hidden bg-background px-4 py-12 text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
          <div className="relative z-10 pt-4 text-center lg:py-10 lg:text-left">
            <motion.p
              {...reveal(0)}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span className="grid size-7 place-items-center rounded-full border border-border">
                <MessageCircle aria-hidden className="size-3.5" />
              </span>
              {eyebrow}
            </motion.p>
            <h1 id={headingId} className={cn(HERO_HEADING_CLASS, "mt-6")}>
              <TextReveal
                text={titleStart}
                className="block"
                stagger={0.055}
                blur={4}
                yOffset={12}
                whileInView
              />
              <TextReveal
                text={titleEnd}
                className="mt-2 block"
                stagger={0.055}
                delay={0.12}
                blur={4}
                yOffset={12}
                whileInView
              />
            </h1>
            <motion.p
              {...reveal(0.12)}
              className="mx-auto mt-6 max-w-md text-pretty text-sm leading-7 text-muted-foreground sm:text-base lg:mx-0"
            >
              {description}
            </motion.p>
            <motion.div
              {...reveal(0.18)}
              className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              <Button
                className="relative after:absolute after:-inset-y-0.5 after:inset-x-0"
                onClick={onPrimaryAction ?? startDemo}
              >
                {primaryLabel}
                <ArrowDown aria-hidden className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="relative after:absolute after:-inset-y-0.5 after:inset-x-0"
                onClick={() => setDocumentOpen(true)}
              >
                See their work
                <ArrowUpRight aria-hidden className="size-4" />
              </Button>
            </motion.div>
            <motion.p
              {...reveal(0.24)}
              className="mt-6 text-xs text-muted-foreground"
            >
              A little more headspace. A lot more possibility.
            </motion.p>
          </div>
          <TeammateStage
            teammates={teammates}
            selectedId={teammate.id}
            teamName={teamName}
            onSelect={selectTeammate}
          />
        </div>

        <motion.div
          {...reveal(0.24)}
          ref={demoRef}
          className="relative z-10 mt-8 overflow-hidden rounded-3xl border border-border bg-background lg:mt-4"
        >
          <TeammateDemo
            teammate={teammate}
            teammates={teammates}
            teamName={teamName}
            runId={replay}
            started={started}
            onStart={() => setStarted(true)}
            onReplay={replayDemo}
            onSelect={selectTeammate}
            onOpenDocument={() => setDocumentOpen(true)}
          />
        </motion.div>
      </div>

      <AnimatedModal
        open={documentOpen}
        onOpenChange={setDocumentOpen}
        panelClassName="max-w-xl"
      >
        <div className="p-6 sm:p-8">
          <div className="mb-7 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText aria-hidden className="size-4" />
              Prepared by {teammate.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close brief"
              className="relative after:absolute after:-inset-0.5"
              onClick={() => setDocumentOpen(false)}
            >
              <X aria-hidden className="size-4" />
            </Button>
          </div>
          <AnimatedModalTitle className="text-xl font-medium">
            {teammate.document.name}
          </AnimatedModalTitle>
          <AnimatedModalDescription className="mt-3 text-sm leading-6 text-muted-foreground">
            {teammate.document.summary}
          </AnimatedModalDescription>
          <div className="mt-7 space-y-6">
            {teammate.document.sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-medium">{section.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-border border-t pt-5">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCheck aria-hidden className="size-4" />
              Ready for your review
            </span>
            <Button
              variant="outline"
              className="relative shrink-0 after:absolute after:-inset-y-0.5 after:inset-x-0"
              onClick={() => setDocumentOpen(false)}
            >
              Back to conversation
            </Button>
          </div>
        </div>
      </AnimatedModal>
    </section>
  );
}

const LIGHT_TEAM_COLORS = ["#f4e8cd", "#b8d9c9", "#ecc394", "#94bdbc"];
const DARK_TEAM_COLORS = ["#152c28", "#376e5c", "#79603d", "#294f62"];

function TeammateStage({
  teammates,
  selectedId,
  teamName,
  onSelect,
}: {
  teammates: readonly AiHeroTeammate[];
  selectedId: string;
  teamName: string;
  onSelect: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const dark = useDarkTheme();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.1 });
  const [pageVisible, setPageVisible] = useState(true);
  const moving = inView && pageVisible && !reduce;

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return (
    <div ref={ref} className="relative isolate min-w-0">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -inset-y-4 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_70%)] sm:-inset-x-12 sm:-inset-y-8"
      >
        <ShaderBackground
          variant="mesh-gradient"
          colors={dark ? DARK_TEAM_COLORS : LIGHT_TEAM_COLORS}
          speed={moving ? 0.18 : 0}
          frame={72}
          distortion={0.65}
          swirl={0.8}
          grainMixer={0.18}
          grainOverlay={0.06}
          scale={0.9}
          maxPixelCount={650_000}
        />
      </div>
      <div className="absolute inset-x-3 top-5 z-10 flex items-center sm:inset-x-6">
        <p className="flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-2 text-xs">
          <TeammateAvatar variant="ink" className="size-5" />
          {teamName} · Your AI team
        </p>
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 600 420"
        fill="none"
        className="pointer-events-none absolute inset-0 size-full text-foreground/10"
      >
        <ellipse
          cx="300"
          cy="235"
          rx="250"
          ry="107"
          stroke="currentColor"
          strokeDasharray="2 7"
          transform="rotate(-12 300 235)"
        />
        <ellipse
          cx="300"
          cy="235"
          rx="220"
          ry="76"
          stroke="currentColor"
          transform="rotate(12 300 235)"
        />
      </svg>
      <nav
        aria-label="AI teammates"
        className="relative grid min-h-96 grid-cols-3 items-center gap-1 px-1 pt-20 pb-16 sm:gap-3 sm:px-4 lg:min-h-[28rem]"
      >
        {teammates.map((item, index) => {
          const selected = selectedId === item.id;
          return (
            <motion.div
              key={item.id}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{
                opacity: 1,
                y: reduce ? 0 : index % 3 === 1 ? -28 : 16,
              }}
              viewport={{ once: true }}
              transition={{
                duration: reduce ? 0 : 0.6,
                delay: reduce ? 0 : index * 0.08,
                ease: EASE_OUT,
              }}
            >
              <Button
                variant="plain"
                aria-label={`Meet ${item.name}, ${item.role}`}
                aria-pressed={selected}
                onClick={() => onSelect(item.id)}
                className="block w-full text-center"
              >
                <motion.span
                  className="flex flex-col items-center"
                  animate={{ scale: reduce ? 1 : selected ? 1.04 : 0.94 }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
                >
                  <TeammateAvatar
                    variant={item.avatar}
                    animated={moving}
                    className="size-24 sm:size-32 lg:size-36"
                  />
                  <span
                    className={cn(
                      "mt-2 inline-flex items-center gap-1.5 rounded-full border bg-background/90 px-3 py-1.5 text-sm font-medium",
                      selected ? "border-foreground/30" : "border-border",
                    )}
                  >
                    {item.name}
                    {selected && <ArrowDown aria-hidden className="size-3" />}
                  </span>
                  <span className="mt-2 text-xs text-muted-foreground">
                    {item.role}
                  </span>
                </motion.span>
              </Button>
            </motion.div>
          );
        })}
      </nav>
      <p className="absolute inset-x-0 bottom-5 text-center text-xs text-muted-foreground">
        Pick a personality. Put a great mind to work.
      </p>
    </div>
  );
}
