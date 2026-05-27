import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { copyTextToClipboard } from "../../utils/clipboard.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 8;

export default function LocationDisplay({
  display,
  copyText,
  className,
  copyEnabled = false,
  onCopy,
}) {
  const [copyAction, setCopyAction] = useState(null);
  const pressTimerRef = useRef(null);
  const pressOriginRef = useRef(null);
  const canCopy = copyEnabled && Boolean(copyText);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current != null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressOriginRef.current = null;
  }, []);

  const copyAddress = useCallback(async (event) => {
    if (!canCopy) return;

    event?.preventDefault?.();
    event?.stopPropagation?.();

    const copied = await copyTextToClipboard(copyText);
    if (copied) {
      onCopy?.();
    }
  }, [canCopy, copyText, onCopy]);

  const openCopyAction = useCallback((anchor) => {
    const rect = anchor.getBoundingClientRect();
    setCopyAction({
      x: rect.left,
      y: rect.bottom + 6,
    });
  }, []);

  const handlePointerDown = useCallback(
    (event) => {
      if (!canCopy || event.button !== 0) return;

      pressOriginRef.current = { x: event.clientX, y: event.clientY };
      clearPressTimer();

      const target = event.currentTarget;
      pressTimerRef.current = window.setTimeout(() => {
        pressTimerRef.current = null;
        openCopyAction(target);
      }, LONG_PRESS_MS);
    },
    [canCopy, clearPressTimer, openCopyAction],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!pressOriginRef.current || pressTimerRef.current == null) return;

      const dx = event.clientX - pressOriginRef.current.x;
      const dy = event.clientY - pressOriginRef.current.y;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        clearPressTimer();
      }
    },
    [clearPressTimer],
  );

  const handlePointerUp = useCallback(() => {
    if (copyAction) return;
    clearPressTimer();
  }, [clearPressTimer, copyAction]);

  const handleCopyClick = useCallback(
    async (event) => {
      await copyAddress(event);
      setCopyAction(null);
    },
    [copyAddress],
  );

  useEffect(() => () => clearPressTimer(), [clearPressTimer]);

  useEffect(() => {
    if (!copyAction) return undefined;

    const dismiss = () => setCopyAction(null);

    const onPointerDown = (event) => {
      if (event.target.closest?.(".location-display__copy-action")) return;
      dismiss();
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", dismiss, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [copyAction]);

  if (!canCopy) {
    return <span className={className}>{display}</span>;
  }

  const rootClass = ["location-display", "location-display--copyable", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <span
        className={rootClass}
        aria-label="Location, long press to copy"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={clearPressTimer}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="location-display__label">{display}</span>
      </span>

      {copyAction &&
        createPortal(
          <button
            type="button"
            className="location-display__copy-action"
            style={{ left: copyAction.x, top: copyAction.y }}
            onMouseDown={suppressMouseFocus}
            onClick={handleCopyClick}
          >
            Copy
          </button>,
          document.body,
        )}
    </>
  );
}
