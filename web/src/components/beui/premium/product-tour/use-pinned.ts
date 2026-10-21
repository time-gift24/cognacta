"use client";

import { useEffect, useState } from "react";

/** True while the media query matches. False on the server and first paint. */
export function usePinned(query: string) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setPinned(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return pinned;
}
