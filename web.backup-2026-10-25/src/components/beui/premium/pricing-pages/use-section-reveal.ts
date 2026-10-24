import { RISE } from "./pricing-page-motion";

/** In-view blur-rise props for page sections; empty with reduced motion. */
export function useSectionReveal(reduce: boolean | null) {
  return reduce
    ? {}
    : {
        initial: "hidden" as const,
        whileInView: "show" as const,
        viewport: { once: true, margin: "-80px" },
        variants: RISE,
      };
}
