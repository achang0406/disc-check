import { useCallback, useState } from "react";
import { createPortal } from "react-dom";

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
  const showTip = Boolean(text) && !disabled;

  const handleMouseEnter = useCallback(
    (event) => {
      onMouseEnter?.(event);
      if (!showTip) return;

      const rect = event.currentTarget.getBoundingClientRect();
      setHoverTip({
        x: rect.left,
        y: rect.bottom + 6,
        text,
      });
    },
    [onMouseEnter, showTip, text],
  );

  const handleMouseLeave = useCallback(
    (event) => {
      onMouseLeave?.(event);
      setHoverTip(null);
    },
    [onMouseLeave],
  );

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
        createPortal(
          <span
            className="location-display__tooltip location-display__tooltip--floating"
            style={{ left: hoverTip.x, top: hoverTip.y }}
            role="tooltip"
          >
            {hoverTip.text}
          </span>,
          document.body,
        )}
    </>
  );
}
