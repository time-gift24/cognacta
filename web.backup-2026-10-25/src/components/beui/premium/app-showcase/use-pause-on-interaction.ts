import { useEffect, useRef, useState } from "react";

/**
 * Reports `paused` while the pointer or keyboard focus is inside the element
 * attached to `ref`. Scope it to the controls an auto-advance drives.
 */
export function usePauseOnInteraction<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const pause = () => setPaused(true);
    const resume = () => setPaused(false);
    const focusOut = (event: FocusEvent) => {
      if (!element.contains(event.relatedTarget as Node | null)) resume();
    };
    element.addEventListener("pointerenter", pause);
    element.addEventListener("pointerleave", resume);
    element.addEventListener("focusin", pause);
    element.addEventListener("focusout", focusOut);
    return () => {
      element.removeEventListener("pointerenter", pause);
      element.removeEventListener("pointerleave", resume);
      element.removeEventListener("focusin", pause);
      element.removeEventListener("focusout", focusOut);
    };
  }, []);

  return { ref, paused };
}
