export default function ProgressBar({ count, target, label }) {
  const pct = Math.min(100, (count / target) * 100);
  const tone = count >= target ? "go" : pct > 60 ? "warn" : "low";

  return (
    <div className="progress-bar">
      <div className="progress-bar__header">
        {label && <span className="progress-bar__label">{label}</span>}
        <span className="progress-bar__count">
          {count} / {target}
        </span>
      </div>
      <div className="progress-bar__track">
        <div
          className={`progress-bar__fill progress-bar__fill--${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
