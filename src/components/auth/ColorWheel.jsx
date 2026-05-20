import { useCallback, useEffect, useRef } from "react";
import {
  drawColorWheel,
  hexToWheelPosition,
  normalizeHex,
  pickHexFromWheel,
} from "../../utils/colorWheel.js";

const WHEEL_SIZE = 200;

export default function ColorWheel({ color, onChange }) {
  const canvasRef = useRef(null);
  const draggingRef = useRef(false);

  const updateFromPointer = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = WHEEL_SIZE / rect.width;
      const scaleY = WHEEL_SIZE / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      const nextColor = pickHexFromWheel(x, y, WHEEL_SIZE);

      if (nextColor) {
        onChange(nextColor);
      }
    },
    [onChange],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawColorWheel(ctx, WHEEL_SIZE);
  }, []);

  useEffect(() => {
    const stopDragging = () => {
      draggingRef.current = false;
    };

    const onMove = (event) => {
      if (!draggingRef.current) return;
      updateFromPointer(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [updateFromPointer]);

  const marker = hexToWheelPosition(color, WHEEL_SIZE);

  return (
    <div style={{ position: "relative", width: WHEEL_SIZE, height: WHEEL_SIZE }}>
      <canvas
        ref={canvasRef}
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        style={{
          width: WHEEL_SIZE,
          height: WHEEL_SIZE,
          borderRadius: "50%",
          cursor: "crosshair",
          display: "block",
        }}
        onPointerDown={(event) => {
          draggingRef.current = true;
          canvasRef.current?.setPointerCapture(event.pointerId);
          updateFromPointer(event.clientX, event.clientY);
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: marker.x - 7,
          top: marker.y - 7,
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "2px solid #f0f0f0",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
          pointerEvents: "none",
          background: color,
        }}
      />
    </div>
  );
}

export function HexColorInput({ color, onChange }) {
  return (
    <input
      style={{
        width: "100%",
        marginTop: 12,
        background: "#0d0d0d",
        border: "1px solid #2a2a2a",
        borderRadius: 8,
        padding: "8px 12px",
        color: "#e8e8e8",
        fontSize: 13,
        fontFamily: "'DM Mono',monospace",
        outline: "none",
      }}
      value={color}
      onChange={(event) => {
        const normalized = normalizeHex(event.target.value);
        if (normalized) onChange(normalized);
      }}
      spellCheck={false}
    />
  );
}
