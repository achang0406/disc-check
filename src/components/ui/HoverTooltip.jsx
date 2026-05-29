import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT_PAD = 12;

function clampTooltipPosition(anchorRect, tipRect) {
  let x = anchorRect.left;
  let y = anchorRect.bottom + 6;

  if (x + tipRect.width > window.innerWidth - VIEWPORT_PAD) {
    x = window.innerWidth - VIEWPORT_PAD - tipRect.width;
  }
  if (x < VIEWPORT_PAD) {
    x = VIEWPORT_PAD;
  }

  if (y + tipRect.height > window.innerHeight - VIEWPORT_PAD) {
    y = anchorRect.top - tipRect.height - 6;
  }
  if (y < VIEWPORT_PAD) {
    y = VIEWPORT_PAD;
  }

  return { x, y };
}

export default function HoverTooltip({
  text,
  as: Component = "span",
  children,
  disabled = false,
  onMouseEnter,
  onMouseLeave,
  ...props
}) {
  const [hoverTip, setHoverTip] = useState(null);
  const [tipPosition, setTipPosition] = useState(null);
  const tipRef = useRef(null);
  const showTip = Boolean(text) && !disabled;

  const handleMouseEnter = useCallback(
    (event) => {
      onMouseEnter?.(event);
      if (!showTip) return;

      const anchorRect = event.currentTarget.getBoundingClientRect();
      setHoverTip({ anchorRect, text });
      setTipPosition({ x: anchorRect.left, y: anchorRect.bottom + 6 });
    },
    [onMouseEnter, showTip, text],
  );

  const handleMouseLeave = useCallback(
    (event) => {
      onMouseLeave?.(event);
      setHoverTip(null);
      setTipPosition(null);
    },
    [onMouseLeave],
  );

  useLayoutEffect(() => {
    if (!hoverTip || !tipRef.current) return;
    const next = clampTooltipPosition(hoverTip.anchorRect, tipRef.current.getBoundingClientRect());
    setTipPosition((current) => {
      if (current && current.x === next.x && current.y === next.y) return current;
      return next;
    });
  }, [hoverTip]);

  const maxWidth = Math.min(280, window.innerWidth - VIEWPORT_PAD * 2);

  return (
    <>
      <Component
        {...props}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </Component>
      {hoverTip &&
        tipPosition &&
        createPortal(
          <span
            ref={tipRef}
            className="location-display__tooltip location-display__tooltip--floating"
            style={{ left: tipPosition.x, top: tipPosition.y, maxWidth }}
            role="tooltip"
          >
            {hoverTip.text}
          </span>,
          document.body,
        )}
    </>
  );
}
