import { useEffect, useState } from "react";
import { MQ_WIDE } from "../constants/breakpoints.js";

function readMatches(query) {
  if (typeof window === "undefined") return query === MQ_WIDE;
  return window.matchMedia(query).matches;
}

export function useBreakpoint() {
  const [isWide, setIsWide] = useState(() => readMatches(MQ_WIDE));

  useEffect(() => {
    const wideMedia = window.matchMedia(MQ_WIDE);
    const update = () => {
      setIsWide(wideMedia.matches);
    };

    wideMedia.addEventListener("change", update);
    window.addEventListener("resize", update);
    update();

    return () => {
      wideMedia.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return { isWide, isCompact: !isWide };
}
