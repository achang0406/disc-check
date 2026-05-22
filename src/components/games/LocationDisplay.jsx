import { useCallback, useRef } from "react";
import HoverTooltip from "../ui/HoverTooltip.jsx";
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
  const lastTapRef = useRef(0);
  const canCopy = copyEnabled && Boolean(copyText);
  const showTooltip = Boolean(tooltip);

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
    <HoverTooltip
      text={showTooltip ? tooltip : undefined}
      className={rootClass}
      onDoubleClick={canCopy ? handleDoubleClick : undefined}
      onTouchEnd={canCopy ? handleTouchEnd : undefined}
    >
      <span className="location-display__label">{display}</span>
    </HoverTooltip>
  );
}
