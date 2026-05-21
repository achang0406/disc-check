export default function ProgressBar({ count, target }) {
  const pct = Math.min(100, (count / target) * 100);
  const go = count >= target;

  return (
    <div>
      <div style={{ marginBottom: 2 }}>
        <span style={{ fontSize: "0.92em", color: "var(--text-subtle)", fontFamily: "'DM Mono',monospace" }}>
          {count} / {target}
        </span>
      </div>
      <div style={{ height: 5, background: "var(--btn-bg)", borderRadius: 999, overflow: "hidden" }}>
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
    </div>
  );
}
