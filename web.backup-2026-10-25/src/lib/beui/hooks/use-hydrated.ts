"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Keep portals out of SSR and the initial hydration pass.
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
