export default function StatusBadge({ count, target, large, cancelled }) {
  const go = !cancelled && count >= target;
  const color = cancelled ? "#888" : go ? "#22c55e" : "#ef4444";
  const bg = cancelled ? "#1a1a1a" : go ? "#0d4f2e" : "#3d1a1a";
  const label = cancelled ? "CANCELLED" : go ? "GAME ON" : "NOT YET";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: large ? 10 : 6,
        background: bg,
        border: `1.5px solid ${color}`,
        borderRadius: 999,
        padding: large ? "8px 20px" : "4px 12px",
        color,
        fontFamily: "'DM Mono',monospace",
        fontWeight: 600,
        fontSize: large ? 18 : 12,
        letterSpacing: "0.06em",
      }}
    >
      <span
        style={{
          width: large ? 10 : 7,
          height: large ? 10 : 7,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}`,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  );
}
