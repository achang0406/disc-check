import { useEffect, useState } from "react";
import { MQ_CHAT_CURSOR, MQ_WIDE } from "../constants/breakpoints.js";

function readMatches(query) {
  if (typeof window === "undefined") return query === MQ_WIDE;
  return window.matchMedia(query).matches;
}

export function useBreakpoint() {
  const [isWide, setIsWide] = useState(() => readMatches(MQ_WIDE));
  const [isChatCursor, setIsChatCursor] = useState(() => readMatches(MQ_CHAT_CURSOR));

  useEffect(() => {
    const wideMedia = window.matchMedia(MQ_WIDE);
    const chatMedia = window.matchMedia(MQ_CHAT_CURSOR);
    const update = () => {
      setIsWide(wideMedia.matches);
      setIsChatCursor(chatMedia.matches);
    };

    wideMedia.addEventListener("change", update);
    chatMedia.addEventListener("change", update);
    window.addEventListener("resize", update);
    update();

    return () => {
      wideMedia.removeEventListener("change", update);
      chatMedia.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return { isWide, isCompact: !isWide, isChatCursor };
}
