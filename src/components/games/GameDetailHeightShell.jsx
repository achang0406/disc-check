import { useLayoutEffect, useRef } from "react";

const HEIGHT_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const HEIGHT_DURATION_MS = 380;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function measurePanel(node) {
  if (!node) return 0;
  return Math.ceil(node.offsetHeight);
}

export default function GameDetailHeightShell({ isWide, wide, compact }) {
  const shellRef = useRef(null);
  const wideRef = useRef(null);
  const compactRef = useRef(null);
  const prevIsWideRef = useRef(isWide);
  const mountedRef = useRef(false);
  const animatingRef = useRef(false);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const wideEl = wideRef.current;
    const compactEl = compactRef.current;
    if (!shell || !wideEl || !compactEl) return;

    const targetEl = isWide ? wideEl : compactEl;
    const nextHeight = measurePanel(targetEl);
    const breakpointChanged = mountedRef.current && prevIsWideRef.current !== isWide;
    prevIsWideRef.current = isWide;
    mountedRef.current = true;

    const setHeight = (height, animate) => {
      if (animate && !prefersReducedMotion()) {
        const currentHeight = measurePanel(shell);
        if (Math.abs(height - currentHeight) < 2) {
          shell.style.transition = "none";
          shell.style.height = `${height}px`;
          return;
        }

        animatingRef.current = true;
        shell.style.transition = `height ${HEIGHT_DURATION_MS}ms ${HEIGHT_EASING}`;
        shell.style.height = `${currentHeight}px`;
        shell.offsetHeight;
        shell.style.height = `${height}px`;
        return;
      }

      shell.style.transition = "none";
      shell.style.height = `${height}px`;
      shell.offsetHeight;
      shell.style.transition = "";
    };

    setHeight(nextHeight, breakpointChanged);

    const handleTransitionEnd = (event) => {
      if (event.target !== shell || event.propertyName !== "height") return;
      animatingRef.current = false;
      shell.style.transition = "";
      shell.style.height = `${measurePanel(targetEl)}px`;
    };

    shell.addEventListener("transitionend", handleTransitionEnd);

    const syncHeight = () => {
      if (animatingRef.current) return;
      const activeEl = isWide ? wideEl : compactEl;
      shell.style.transition = "none";
      shell.style.height = `${measurePanel(activeEl)}px`;
    };

    const observer = new ResizeObserver(syncHeight);
    observer.observe(wideEl);
    observer.observe(compactEl);

    return () => {
      shell.removeEventListener("transitionend", handleTransitionEnd);
      observer.disconnect();
    };
  }, [isWide]);

  return (
    <div className="detail-height-shell" ref={shellRef}>
      <div
        ref={wideRef}
        className={`detail-height-shell__panel${isWide ? "" : " detail-height-shell__panel--inactive"}`}
        aria-hidden={!isWide}
      >
        {wide}
      </div>
      <div
        ref={compactRef}
        className={`detail-height-shell__panel${isWide ? " detail-height-shell__panel--inactive" : ""}`}
        aria-hidden={isWide}
      >
        {compact}
      </div>
    </div>
  );
}
