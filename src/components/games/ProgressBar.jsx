export default function ProgressBar({ count, target, compact }) {
  const pct = Math.min(100, (count / target) * 100);
  const go = count >= target;

  return (
    <div style={{ marginTop: compact ? 0 : 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: compact ? 2 : 4 }}>
        <span style={{ fontSize: compact ? "0.92em" : 11, color: "var(--text-subtle)", fontFamily: "'DM Mono',monospace" }}>
          {count} / {target}
        </span>
        <span
          style={{
            fontSize: compact ? "0.92em" : 11,
            color: go ? "#4ade80" : "var(--text-subtle)",
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{ height: compact ? 5 : 6, background: "var(--btn-bg)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            width: `${pct}%`,
            background: go
              ? "linear-gradient(90deg,#22c55e,#4ade80)"
              : pct > 60
                ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                : "linear-gradient(90deg,#ef4444,#f87171)",
            transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>
      {count < target && !compact && (
        <p style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 4, fontFamily: "'DM Mono',monospace" }}>
          {target - count} more needed
        </p>
      )}
    </div>
  );
}
