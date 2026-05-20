export default function StatusBadge({ count, target, large, cancelled }) {
  const go = !cancelled && count >= target;
  const variant = cancelled ? "cancelled" : go ? "go" : "not";

  return (
    <div
      className={`status-badge status-badge--${variant}${large ? " status-badge--large" : ""}`}
    >
      <span className="status-badge__dot" />
      {cancelled ? "CANCELLED" : go ? "GAME ON" : "NOT YET"}
    </div>
  );
}
