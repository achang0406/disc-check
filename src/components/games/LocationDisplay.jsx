import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { copyTextToClipboard } from "../../utils/clipboard.js";

const DOUBLE_TAP_MS = 350;

export default function LocationDisplay({
  display,
  tooltip,
  copyText,
  className,
  copyEnabled = false,
  onCopy,
}) {
  const [hoverTip, setHoverTip] = useState(null);
  const lastTapRef = useRef(0);
  const canCopy = copyEnabled && Boolean(copyText);
  const showTooltip = Boolean(tooltip);

  const updateHoverTip = useCallback((target) => {
    if (!tooltip || !target) {
      setHoverTip(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    setHoverTip({
      x: rect.left,
      y: rect.bottom + 6,
      text: tooltip,
    });
  }, [tooltip]);

  const copyAddress = useCallback(async (event) => {
    if (!canCopy) return;

    event?.preventDefault?.();
    event?.stopPropagation?.();

    const copied = await copyTextToClipboard(copyText);
    if (copied) {
      onCopy?.();
    }
  }, [canCopy, copyText, onCopy]);

  function handleDoubleClick(event) {
    copyAddress(event);
  }

  function handleTouchEnd(event) {
    if (!canCopy) return;

    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      copyAddress(event);
      return;
    }

    lastTapRef.current = now;
  }

  if (!showTooltip && !canCopy) {
    return <span className={className}>{display}</span>;
  }

  const rootClass = [
    "location-display",
    canCopy ? "location-display--copyable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <span
        className={rootClass}
        onMouseEnter={(event) => updateHoverTip(event.currentTarget)}
        onMouseLeave={() => setHoverTip(null)}
        onDoubleClick={canCopy ? handleDoubleClick : undefined}
        onTouchEnd={canCopy ? handleTouchEnd : undefined}
      >
        <span className="location-display__label">{display}</span>
      </span>
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
