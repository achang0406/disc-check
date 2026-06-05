import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getPortalTarget } from "../../utils/portalTarget.js";

const DEFAULT_SPOTLIGHT_PAD = 8;
const BUBBLE_GAP = 18;
const VIEWPORT_PAD = 12;
const SETTLE_MS = 220;

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

function getBubbleLayout(rect, spotlightPad = DEFAULT_SPOTLIGHT_PAD) {
  const width = Math.min(340, window.innerWidth - VIEWPORT_PAD * 2);
  const left = Math.min(
    Math.max(VIEWPORT_PAD, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - VIEWPORT_PAD,
  );
  const targetCenterX = rect.left + rect.width / 2;
  const tailX = Math.min(Math.max(28, targetCenterX - left), width - 28);
  const spaceBelow = window.innerHeight - (rect.top + rect.height + spotlightPad);
  const spaceAbove = rect.top - spotlightPad;
  const placeBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;

  if (placeBelow) {
    return {
      width,
      left,
      top: Math.min(rect.bottom + spotlightPad + BUBBLE_GAP, window.innerHeight - VIEWPORT_PAD),
      placement: "below",
      tailX,
    };
  }

  return {
    width,
    left,
    top: Math.max(VIEWPORT_PAD, rect.top - spotlightPad - BUBBLE_GAP),
    placement: "above",
    tailX,
  };
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
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const [settled, setSettled] = useState(false);
  const rafRef = useRef(null);
  const spotlightPad = step.spotlightPad ?? DEFAULT_SPOTLIGHT_PAD;

  const measureLayout = useCallback(() => {
    const rect = findTargetRect(step);
    const pad = step.spotlightPad ?? DEFAULT_SPOTLIGHT_PAD;

    if (!rect) {
      setLayout(null);
      return;
    }

    setLayout({
      rect,
      bubble: getBubbleLayout(rect, pad),
    });
  }, [step]);

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      measureLayout();
    });
  }, [measureLayout]);

  useEffect(() => {
    setPortalTarget(getPortalTarget());
  }, []);

  useEffect(() => {
    setSettled(false);
    const timer = window.setTimeout(() => {
      setSettled(true);
      measureLayout();
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [measureLayout, stepIndex, step.id]);

  useEffect(() => {
    if (!portalTarget || !settled) return undefined;

    measureLayout();

    const handleViewportChange = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      scheduleMeasure();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", scheduleMeasure, true);

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
      resizeObserver?.disconnect();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [portalTarget, settled, measureLayout, scheduleMeasure, step]);

  useEffect(() => {
    if (!layout || !settled) return;
    document.querySelector(".walkthrough-bubble__btn--next")?.focus({ preventScroll: true });
  }, [layout, settled, stepIndex]);

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

  if (!portalTarget || !settled || !layout) return null;

  const { rect, bubble } = layout;
  const spotlight = {
    x: rect.left - spotlightPad,
    y: rect.top - spotlightPad,
    width: rect.width + spotlightPad * 2,
    height: rect.height + spotlightPad * 2,
  };

  const isLastStep = stepIndex >= totalSteps - 1;
  const bubbleStyle = {
    top: `${bubble.top}px`,
    left: `${bubble.left}px`,
    width: `${bubble.width}px`,
    "--walkthrough-tail-x": `${bubble.tailX}px`,
    ...(bubble.placement === "above" ? { transform: "translateY(-100%)" } : {}),
  };

  return createPortal(
    <div className="walkthrough-layer" role="presentation">
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
