import { useEffect, useState } from "react";
import { MQ_WIDE } from "../constants/breakpoints.js";

function readIsWide() {
  if (typeof window === "undefined") return true;
  return window.matchMedia(MQ_WIDE).matches;
}

export function useBreakpoint() {
  const [isWide, setIsWide] = useState(readIsWide);

  useEffect(() => {
    const media = window.matchMedia(MQ_WIDE);
    const update = () => setIsWide(media.matches);

    media.addEventListener("change", update);
    window.addEventListener("resize", update);
    update();

    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return { isWide, isCompact: !isWide };
}
