import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getOverlayViewport } from "../../utils/overlayViewport.js";
import { getPortalTarget } from "../../utils/portalTarget.js";

const DEFAULT_SPOTLIGHT_PAD = 8;
const BUBBLE_GAP = 18;
const VIEWPORT_PAD = 12;
const SETTLE_MS = 220;
const LAYOUT_EPSILON = 1;

function findTargetRect(step) {
  const keys = [step.target, step.fallbackTarget].filter(Boolean);

  for (const key of keys) {
    const element = document.querySelector(`[data-walkthrough-target="${key}"]`);
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
  }

  return null;
}

function planBubbleLayout(rect, spotlightPad, bubbleHeight, viewport) {
  const width = Math.min(340, viewport.width - VIEWPORT_PAD * 2);
  const left = Math.min(
    Math.max(VIEWPORT_PAD, rect.left + rect.width / 2 - width / 2),
    viewport.width - width - VIEWPORT_PAD,
  );
  const targetCenterX = rect.left + rect.width / 2;
  const tailX = Math.min(Math.max(28, targetCenterX - left), width - 28);
  const cutoutBottom = rect.bottom + spotlightPad;
  const cutoutTop = rect.top - spotlightPad;
  const gapTop = cutoutBottom + BUBBLE_GAP;
  const height = Math.max(bubbleHeight, 0);
  const fitsBelow = gapTop + height <= viewport.height - VIEWPORT_PAD;

  if (fitsBelow) {
    return {
      width,
      left,
      top: Math.min(gapTop, viewport.height - VIEWPORT_PAD - Math.max(height, 1)),
      placement: "below",
      tailX,
    };
  }

  return {
    width,
    left,
    top: Math.max(VIEWPORT_PAD, cutoutTop - BUBBLE_GAP - Math.max(height, 1)),
    placement: "above",
    tailX,
  };
}

function layoutsNearlyEqual(previous, next) {
  if (!previous || !next) return false;

  const prevBubble = previous.bubble;
  const nextBubble = next.bubble;

  return (
    Math.abs(previous.rect.top - next.rect.top) < LAYOUT_EPSILON
    && Math.abs(previous.rect.left - next.rect.left) < LAYOUT_EPSILON
    && Math.abs(prevBubble.top - nextBubble.top) < LAYOUT_EPSILON
    && Math.abs(prevBubble.left - nextBubble.left) < LAYOUT_EPSILON
    && Math.abs(prevBubble.width - nextBubble.width) < LAYOUT_EPSILON
    && prevBubble.placement === nextBubble.placement
  );
}

export default function WalkthroughOverlay({
  step,
  stepIndex,
  totalSteps,
  canGoBack = false,
  onNext,
  onBack,
  onSkip,
}) {
  const maskId = useId().replace(/:/g, "");
  const titleId = useId();
  const bodyId = useId();
  const [portalTarget, setPortalTarget] = useState(null);
  const [layout, setLayout] = useState(null);
  const lastLayoutRef = useRef(null);
  const bubbleRef = useRef(null);
  const lastBubbleHeightRef = useRef(0);
  const [viewport, setViewport] = useState(getOverlayViewport);
  const rafRef = useRef(null);
  const spotlightPad = step.spotlightPad ?? DEFAULT_SPOTLIGHT_PAD;

  const readBubbleHeight = useCallback(() => {
    const measured = bubbleRef.current?.getBoundingClientRect().height ?? 0;
    if (measured > 0) {
      lastBubbleHeightRef.current = measured;
      return measured;
    }
    return lastBubbleHeightRef.current;
  }, []);

  const buildLayout = useCallback(
    (
      rect,
      pad = step.spotlightPad ?? DEFAULT_SPOTLIGHT_PAD,
      bubbleHeight = readBubbleHeight(),
      viewportMetrics = getOverlayViewport(),
    ) => ({
      rect,
      bubble: planBubbleLayout(rect, pad, bubbleHeight, viewportMetrics),
    }),
    [readBubbleHeight, step.spotlightPad],
  );

  const applyLayout = useCallback(
    (next, { allowSkip = true } = {}) => {
      if (allowSkip && layoutsNearlyEqual(lastLayoutRef.current, next)) return false;
      lastLayoutRef.current = next;
      setLayout(next);
      return true;
    },
    [],
  );

  const measureLayout = useCallback(() => {
    const rect = findTargetRect(step);
    if (!rect) return false;
    return applyLayout(buildLayout(rect, step.spotlightPad ?? DEFAULT_SPOTLIGHT_PAD, readBubbleHeight(), getOverlayViewport()));
  }, [applyLayout, buildLayout, readBubbleHeight, step]);

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      measureLayout();
    });
  }, [measureLayout]);

  const syncViewport = useCallback(() => {
    setViewport(getOverlayViewport());
    scheduleMeasure();
  }, [scheduleMeasure]);

  useEffect(() => {
    setPortalTarget(getPortalTarget());
  }, []);

  useLayoutEffect(() => {
    if (!portalTarget) return;

    const rect = findTargetRect(step);
    if (!rect) return;

    applyLayout(buildLayout(rect), { allowSkip: true });
  }, [portalTarget, step, stepIndex, step.id, step.title, step.body, layout, applyLayout, buildLayout]);

  useEffect(() => {
    const settleTimer = window.setTimeout(measureLayout, SETTLE_MS);
    const carouselTimer = window.setTimeout(measureLayout, 450);

    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(carouselTimer);
    };
  }, [measureLayout, stepIndex, step.id]);

  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(bubble);
    return () => observer.disconnect();
  }, [layout, scheduleMeasure, stepIndex]);

  useEffect(() => {
    if (!portalTarget) return undefined;

    const handleViewportChange = () => syncViewport();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", scheduleMeasure, true);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    const observed = (step.target ? [step.target] : [])
      .flatMap((key) => [...document.querySelectorAll(`[data-walkthrough-target="${key}"]`)]);

    let resizeObserver;
    if (observed.length > 0 && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      for (const element of observed) {
        resizeObserver.observe(element);
      }
    }

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", scheduleMeasure, true);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      resizeObserver?.disconnect();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [portalTarget, scheduleMeasure, step, syncViewport]);

  useEffect(() => {
    if (!layout) return;
    document.querySelector(".walkthrough-bubble__btn--next")?.focus({ preventScroll: true });
  }, [layout, stepIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip]);

  if (!portalTarget) return null;

  const displayLayout = layout ?? lastLayoutRef.current;
  const isLastStep = stepIndex >= totalSteps - 1;
  const layerStyle = {
    top: `${viewport.offsetTop}px`,
    left: `${viewport.offsetLeft}px`,
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
  };

  if (!displayLayout) {
    return createPortal(
      <div className="walkthrough-layer" style={layerStyle} role="presentation">
        <div className="walkthrough-scrim walkthrough-scrim--full" aria-hidden="true" />
      </div>,
      portalTarget,
    );
  }

  const { rect, bubble } = displayLayout;
  const spotlight = {
    x: rect.left - spotlightPad,
    y: rect.top - spotlightPad,
    width: rect.width + spotlightPad * 2,
    height: rect.height + spotlightPad * 2,
  };

  const bubbleStyle = {
    top: `${bubble.top}px`,
    left: `${bubble.left}px`,
    width: `${bubble.width}px`,
    "--walkthrough-tail-x": `${bubble.tailX}px`,
  };

  return createPortal(
    <div className="walkthrough-layer" style={layerStyle} role="presentation">
      <svg
        className="walkthrough-scrim"
        aria-hidden="true"
        width={viewport.width}
        height={viewport.height}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      >
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <rect
              className="walkthrough-scrim__spotlight"
              x={spotlight.x}
              y={spotlight.y}
              width={spotlight.width}
              height={spotlight.height}
              rx="10"
              ry="10"
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.78)" mask={`url(#${maskId})`} />
      </svg>

      <div
        ref={bubbleRef}
        className={`walkthrough-bubble walkthrough-bubble--${bubble.placement}`}
        style={bubbleStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}
      >
        <button
          type="button"
          className="walkthrough-bubble__dismiss"
          aria-label="Dismiss tour"
          onClick={onSkip}
        >
          ×
        </button>

        <div
          className="walkthrough-bubble__dots"
          role="img"
          aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }, (_, index) => (
            <span
              key={index}
              className={`walkthrough-bubble__dot${index === stepIndex ? " walkthrough-bubble__dot--active" : ""}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <h3 id={titleId} className="walkthrough-bubble__title">
          {step.title}
        </h3>
        <p id={bodyId} className="walkthrough-bubble__body">
          {step.body}
        </p>
        <div
          className={`walkthrough-bubble__nav${canGoBack ? "" : " walkthrough-bubble__nav--solo"}`}
        >
          {canGoBack ? (
            <button type="button" className="walkthrough-bubble__btn walkthrough-bubble__btn--back" onClick={onBack}>
              Back
            </button>
          ) : null}
          <button type="button" className="walkthrough-bubble__btn walkthrough-bubble__btn--next" onClick={onNext}>
            {isLastStep ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
