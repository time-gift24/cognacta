"use client";

import type {
  AppShowcaseDestination,
  AppShowcaseLabels,
  AppShowcasePeople,
  AppShowcasePersonId,
  AppShowcasePlanItem,
  AppShowcaseScreenId,
  AppShowcaseSplitEntry,
  AppShowcaseStop,
  AppShowcaseTicket,
} from "../app-showcase-data";
import { PlanScreen } from "./plan-screen";
import { RouteScreen } from "./route-screen";
import { SplitScreen } from "./split-screen";
import { TicketScreen } from "./ticket-screen";

/** Data the built-in screens read from. */
export type AppShowcaseScreenContent = {
  people: AppShowcasePeople;
  destination: AppShowcaseDestination;
  planItems: readonly AppShowcasePlanItem[];
  planMembers: readonly AppShowcasePersonId[];
  stops: readonly AppShowcaseStop[];
  split: readonly AppShowcaseSplitEntry[];
  ticket: AppShowcaseTicket;
};

const SCREEN_IDS: readonly string[] = ["plan", "route", "split", "tickets"];

export function isBuiltInScreen(id: string): id is AppShowcaseScreenId {
  return SCREEN_IDS.includes(id);
}

export function BuiltInScreen({
  screen,
  content,
  labels,
  reduce,
}: {
  screen: AppShowcaseScreenId;
  content: AppShowcaseScreenContent;
  labels: AppShowcaseLabels;
  reduce: boolean | null;
}) {
  switch (screen) {
    case "plan":
      return (
        <PlanScreen
          destination={content.destination}
          items={content.planItems}
          members={content.planMembers}
          people={content.people}
          day={labels.planDay}
          reduce={reduce}
        />
      );
    case "route":
      return (
        <RouteScreen
          stops={content.stops}
          eyebrow={labels.routeEyebrow}
          totalSuffix={labels.routeTotalSuffix}
          startLabel={labels.routeStart}
          stepSuffix={labels.routeStepSuffix}
          reduce={reduce}
        />
      );
    case "split":
      return (
        <SplitScreen
          entries={content.split}
          people={content.people}
          eyebrow={labels.splitEyebrow}
          title={labels.splitTitle}
          totalLabel={labels.splitTotal}
          currency={labels.currency}
          reduce={reduce}
        />
      );
    case "tickets":
      return (
        <TicketScreen
          ticket={content.ticket}
          eyebrow={labels.ticketsEyebrow}
          title={labels.ticketsTitle}
          seatLabel={labels.seat}
          groupLabel={labels.group}
          reduce={reduce}
        />
      );
  }
}
