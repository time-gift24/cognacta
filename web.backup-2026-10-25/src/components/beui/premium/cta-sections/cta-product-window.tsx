"use client";

import {
  Activity,
  ArrowUpRight,
  Bot,
  CircleCheck,
  Clock3,
  Inbox,
  LayoutGrid,
  MessageSquareText,
  Search,
  Workflow,
} from "lucide-react";
import { ButtonLink } from "@/components/beui/motion/button";
import { ShaderBackground } from "@/components/beui/motion/shader-background";
import { cn } from "@/lib/beui/utils";

export type CtaProductWindowLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type CtaProductWindowProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  cta?: CtaProductWindowLink;
  className?: string;
};

const threads = [
  {
    title: "Enterprise onboarding",
    detail: "AI drafted the rollout plan",
    time: "Now",
    active: true,
  },
  {
    title: "Usage alert review",
    detail: "Three accounts need attention",
    time: "4m",
  },
  {
    title: "Renewal preparation",
    detail: "Brief ready for the account team",
    time: "12m",
  },
];

function externalProps(external?: boolean) {
  return external ? { target: "_blank", rel: "noreferrer noopener" } : {};
}

function ProductWindow() {
  return (
    <div
      aria-hidden
      className="absolute -right-6 -bottom-6 left-4 overflow-hidden rounded-tl-2xl border border-border/70 bg-background sm:left-7 lg:left-10"
    >
      <div className="flex h-12 items-center justify-between border-border/70 border-b px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
            <Bot aria-hidden className="size-3.5" />
          </span>
          <span className="font-medium text-sm">Relay</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="size-1.5 rounded-full bg-foreground" />
          All systems ready
        </div>
      </div>

      <div className="grid min-h-[25rem] sm:grid-cols-[8.5rem_1fr]">
        <aside className="hidden border-border/70 border-r bg-background/70 p-3 sm:flex sm:flex-col">
          <nav aria-label="Product preview" className="space-y-1 text-xs">
            <span className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 font-medium text-foreground">
              <Inbox aria-hidden className="size-3.5" /> Inbox
            </span>
            <span className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-muted-foreground">
              <Workflow aria-hidden className="size-3.5" /> Automations
            </span>
            <span className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-muted-foreground">
              <LayoutGrid aria-hidden className="size-3.5" /> Workspaces
            </span>
          </nav>
          <div className="mt-auto rounded-xl border border-border/70 bg-background/70 p-3">
            <div className="flex items-center gap-2 text-xs">
              <Activity aria-hidden className="size-3.5" /> 82% automated
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-4/5 rounded-full bg-primary" />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex h-14 items-center justify-between gap-3 border-border/70 border-b px-4">
            <div>
              <p className="font-medium text-sm">Priority queue</p>
              <p className="text-muted-foreground text-xs">Updated just now</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground">
              <Search aria-hidden className="size-4" />
            </span>
          </div>

          <div className="grid md:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="space-y-2 p-3">
              {threads.map((thread) => (
                <div
                  key={thread.title}
                  className={cn(
                    "rounded-xl p-3",
                    thread.active
                      ? "bg-muted text-foreground"
                      : "border border-border/70 bg-background/70",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">
                        {thread.title}
                      </p>
                      <p className="mt-1 truncate text-muted-foreground text-xs">
                        {thread.detail}
                      </p>
                    </div>
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {thread.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden border-border/70 border-l p-3 md:block">
              <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-muted text-foreground">
                    <MessageSquareText aria-hidden className="size-4" />
                  </span>
                  <span className="rounded-full border border-border px-2 py-1 text-muted-foreground text-xs">
                    Live
                  </span>
                </div>
                <p className="mt-6 font-medium text-sm">AI handoff ready</p>
                <p className="mt-2 text-pretty text-muted-foreground text-xs leading-5">
                  Relay prepared the context, next steps, and owner notes.
                </p>
                <div className="mt-5 space-y-2 border-border/70 border-t pt-3 text-xs">
                  <p className="flex items-center gap-2">
                    <CircleCheck aria-hidden className="size-3.5" /> Context
                    added
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Clock3 aria-hidden className="size-3.5" /> Saved 18 minutes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CtaProductWindow({
  eyebrow = "AI support, ready on day one",
  title = "Give your team their focus back.",
  description = "Connect your customer workspace and let AI prepare every handoff, follow-up, and next step—without rebuilding your workflow.",
  cta = { label: "Start building free", href: "#" },
  className,
}: CtaProductWindowProps) {
  return (
    <section className={cn("w-full px-4 py-16 sm:px-8", className)}>
      <div className="mx-auto grid w-full max-w-6xl rounded-3xl border border-border bg-background p-2 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex min-h-[28rem] items-center px-7 py-14 sm:px-12 lg:min-h-[34rem] lg:px-14">
          <div className="max-w-lg font-sans">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
              {eyebrow}
            </p>
            <h2 className="mt-6 text-balance text-4xl font-medium leading-tight tracking-tight text-foreground">
              {title}
            </h2>
            <p className="mt-5 max-w-md text-pretty text-base leading-7 text-muted-foreground">
              {description}
            </p>
            <ButtonLink
              href={cta.href}
              size="lg"
              className="mt-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full h-9"
              {...externalProps(cta.external)}
            >
              {cta.label}
              <ArrowUpRight aria-hidden className="size-4" />
            </ButtonLink>
          </div>
        </div>

        <div className="relative isolate min-h-[31rem] overflow-hidden rounded-2xl contain-paint lg:min-h-[34rem]">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,221,181,0.92),rgba(82,145,141,0.92))]"
          >
            <ShaderBackground
              variant="static-mesh-gradient"
              colors={["#f4dfbd", "#e69a78", "#91c8b8", "#315f63"]}
              positions={18}
              waveX={0.72}
              waveXShift={0.18}
              waveY={0.88}
              waveYShift={0.62}
              mixing={0.68}
              grainMixer={0.08}
              grainOverlay={0.06}
              rotation={0}
              speed={0}
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.75)_0.75px,transparent_0.75px)] [background-size:8px_8px]"
          />
          <div
            aria-hidden
            className="absolute -right-4 -bottom-4 left-2 h-[28rem] rounded-tl-3xl border border-border/50 bg-background/30 backdrop-blur-lg sm:left-5 lg:left-8"
          />
          <ProductWindow />
        </div>
      </div>
    </section>
  );
}
