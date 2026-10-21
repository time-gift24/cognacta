"use client";

import { Smartphone } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useRef, useState } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import {
  APP_SHOWCASE_DESTINATION,
  APP_SHOWCASE_FEATURES,
  APP_SHOWCASE_INTERVAL_MS,
  APP_SHOWCASE_LABELS,
  APP_SHOWCASE_PEOPLE,
  APP_SHOWCASE_PLAN,
  APP_SHOWCASE_PLAN_MEMBERS,
  APP_SHOWCASE_SHADER_COLORS,
  APP_SHOWCASE_SPLIT,
  APP_SHOWCASE_STOPS,
  APP_SHOWCASE_TICKET,
  type AppShowcaseDestination,
  type AppShowcaseFeature,
  type AppShowcaseLabels,
  type AppShowcasePeople,
  type AppShowcasePersonId,
  type AppShowcasePlanItem,
  type AppShowcaseShaderColors,
  type AppShowcaseSplitEntry,
  type AppShowcaseStop,
  type AppShowcaseTicket,
} from "./app-showcase-data";
import { FeatureRow } from "./feature-row";
import { FeatureTabs } from "./feature-tabs";
import { PhoneFrame } from "./phone-frame";
import { BuiltInScreen, isBuiltInScreen } from "./screens/built-in-screen";
import { ShowcaseStage } from "./showcase-stage";
import { useAutoAdvance } from "./use-auto-advance";
import { usePauseOnInteraction } from "./use-pause-on-interaction";

/* ─────────────────────────────────────────────────────────
 * APP SHOWCASE STORYBOARD
 *
 *  stage    the phone floats on a slow mesh-gradient shader and
 *           tilts toward the pointer on hover-capable devices
 *  auto     the active feature advances every 5s while the section
 *           is on screen; hover or focus on the features pauses it
 *  select   the screen slides in from the side of travel with a
 *           soft blur, then plays its own detail motion:
 *             plan     cover photo settles, itinerary rows stagger
 *             route    the path draws and stops pop in order
 *             split    the total rolls and share bars grow
 *             tickets  the pass tips forward into place
 *  notice   a teammate's activity chip pops beside the phone just
 *           after the screen lands
 *  reduced  no auto-advance, tilt, or slides; screens swap instantly
 *
 *  Parts: FeatureRow (desktop), FeatureTabs (mobile), ShowcaseStage
 *  (shader, tilt, notice chip), PhoneFrame, and screens/ (Plan,
 *  Route, Split, Ticket). Hooks: useAutoAdvance,
 *  usePauseOnInteraction. Motion variants live in
 *  app-showcase-motion.ts; data shapes in app-showcase-data.ts.
 * ───────────────────────────────────────────────────────── */

export type AppShowcasePhoneProps = {
  title?: ReactNode;
  description?: ReactNode;
  /** Features shown beside the phone, split across both sides on desktop. */
  features?: readonly AppShowcaseFeature[];
  /** People referenced by notices, plan members, and split entries. */
  people?: AppShowcasePeople;
  destination?: AppShowcaseDestination;
  planItems?: readonly AppShowcasePlanItem[];
  /** People stacked on the plan cover. */
  planMembers?: readonly AppShowcasePersonId[];
  stops?: readonly AppShowcaseStop[];
  split?: readonly AppShowcaseSplitEntry[];
  ticket?: AppShowcaseTicket;
  /** Mesh-gradient colors behind the phone. */
  shaderColors?: AppShowcaseShaderColors;
  /** Auto-advance interval in ms. */
  interval?: number;
  primaryHref?: string;
  secondaryHref?: string;
  /** Override any interface copy. */
  labels?: Partial<AppShowcaseLabels>;
  /**
   * Custom phone screen for a feature. Return `null` or `undefined` to
   * fall back to the built-in screen named by `feature.screen ?? feature.id`.
   */
  renderScreen?: (featureId: string) => ReactNode;
  className?: string;
};

export function AppShowcasePhone({
  title = "The whole trip, in your pocket.",
  description = "Plan together before you leave, then keep routes, costs, and tickets close once you land.",
  features = APP_SHOWCASE_FEATURES,
  people = APP_SHOWCASE_PEOPLE,
  destination = APP_SHOWCASE_DESTINATION,
  planItems = APP_SHOWCASE_PLAN,
  planMembers = APP_SHOWCASE_PLAN_MEMBERS,
  stops = APP_SHOWCASE_STOPS,
  split = APP_SHOWCASE_SPLIT,
  ticket = APP_SHOWCASE_TICKET,
  shaderColors = APP_SHOWCASE_SHADER_COLORS,
  interval = APP_SHOWCASE_INTERVAL_MS,
  primaryHref = "#",
  secondaryHref = "#",
  labels: labelOverrides,
  renderScreen,
  className,
}: AppShowcasePhoneProps) {
  const reduce = useReducedMotion();
  const labels = { ...APP_SHOWCASE_LABELS, ...labelOverrides };
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { margin: "-20% 0px" });
  const { ref: gridRef, paused } = usePauseOnInteraction<HTMLDivElement>();
  const [[rawIndex, direction], setActive] = useState<[number, number]>([0, 1]);
  const count = features.length;
  const index = Math.min(rawIndex, Math.max(0, count - 1));
  const running = !reduce && inView && !paused && count > 1;

  const select = (next: number) => {
    if (next < 0) return;
    setActive(([current]) => [next, next >= current ? 1 : -1]);
  };

  useAutoAdvance({
    running,
    index,
    interval,
    advance: () => setActive([(index + 1) % count, 1]),
  });

  const active = features[index];
  if (!active) return null;

  const screenKind = active.screen ?? active.id;
  const screen =
    renderScreen?.(active.id) ??
    (isBuiltInScreen(screenKind) ? (
      <BuiltInScreen
        screen={screenKind}
        content={{
          people,
          destination,
          planItems,
          planMembers,
          stops,
          split,
          ticket,
        }}
        labels={labels}
        reduce={reduce}
      />
    ) : null);

  const half = Math.ceil(count / 2);
  const rows = (start: number, end: number) =>
    features
      .slice(start, end)
      .map((feature, offset) => (
        <FeatureRow
          key={feature.id}
          feature={feature}
          active={start + offset === index}
          running={running}
          reduce={reduce}
          interval={interval}
          onSelect={() => select(start + offset)}
        />
      ));

  return (
    <section
      ref={sectionRef}
      aria-labelledby="app-showcase-title"
      className={cn(
        "w-full overflow-hidden bg-background px-4 py-16 font-sans text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            {labels.eyebrow}
          </p>
          <h2
            id="app-showcase-title"
            className="mt-4 text-balance font-medium text-4xl tracking-tight"
          >
            {title}
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground leading-7">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <ButtonLink href={primaryHref}>
              <Smartphone className="size-4" aria-hidden="true" />
              {labels.primaryCta}
            </ButtonLink>
            <ButtonLink href={secondaryHref} variant="outline">
              {labels.secondaryCta}
            </ButtonLink>
          </div>
        </div>

        <div
          ref={gridRef}
          className="mt-12 grid items-center gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-10"
        >
          <ul className="hidden space-y-2 lg:block">{rows(0, half)}</ul>

          <FeatureTabs
            features={features}
            active={active}
            reduce={reduce}
            label={labels.featuresLabel}
            onSelect={select}
          />

          <ShowcaseStage
            noticeKey={active.id}
            noticeText={active.notice.text}
            noticePerson={people[active.notice.person]}
            shaderColors={shaderColors}
            reduce={reduce}
          >
            <PhoneFrame
              screenKey={active.id}
              label={`${labels.screenLabel}: ${active.title}`}
              direction={direction}
              reduce={reduce}
            >
              {screen}
            </PhoneFrame>
          </ShowcaseStage>

          <ul className="hidden space-y-2 lg:block">{rows(half, count)}</ul>
        </div>
      </div>
    </section>
  );
}
