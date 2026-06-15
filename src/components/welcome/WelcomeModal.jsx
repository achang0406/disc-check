import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { getOverlayViewport } from "../../utils/overlayViewport.js";
import { getPortalTarget } from "../../utils/portalTarget.js";

export default function WelcomeModal({
  step,
  stepIndex,
  totalSteps,
  canGoBack = false,
  onNext,
  onBack,
  onSkip,
}) {
  const titleId = useId();
  const bodyId = useId();
  const [portalTarget, setPortalTarget] = useState(null);
  const [viewport, setViewport] = useState(getOverlayViewport);

  useEffect(() => {
    setPortalTarget(getPortalTarget());
  }, []);

  useEffect(() => {
    const syncViewport = () => setViewport(getOverlayViewport());

    window.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
    };
  }, []);

  useEffect(() => {
    document.querySelector(".welcome-modal__btn--next")?.focus({ preventScroll: true });
  }, [stepIndex, step?.id]);

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

  if (!portalTarget || !step) return null;

  const isLastStep = stepIndex >= totalSteps - 1;
  const layerStyle = {
    top: `${viewport.offsetTop}px`,
    left: `${viewport.offsetLeft}px`,
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
  };

  return createPortal(
    <div className="walkthrough-layer welcome-modal" style={layerStyle} role="presentation">
      <div className="walkthrough-scrim walkthrough-scrim--full" aria-hidden="true" />

      <div
        className="walkthrough-bubble walkthrough-bubble--centered welcome-modal__bubble"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}
      >
        <button
          type="button"
          className="walkthrough-bubble__dismiss"
          aria-label="Dismiss welcome"
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
            <button
              type="button"
              className="walkthrough-bubble__btn walkthrough-bubble__btn--back"
              onClick={onBack}
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            className="walkthrough-bubble__btn walkthrough-bubble__btn--next welcome-modal__btn--next"
            onClick={onNext}
          >
            {isLastStep ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
