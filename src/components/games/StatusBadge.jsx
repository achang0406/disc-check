export function getGameStatusVariant(count, target, cancelled) {
  if (cancelled) return "cancelled";
  if (count >= target) return "go";
  if (count >= Math.max(1, target - 2)) return "almost";
  return "not";
}

export default function StatusBadge({ count, target, large, cancelled }) {
  const variant = getGameStatusVariant(count, target, cancelled);
  const label =
    variant === "cancelled"
      ? "CANCELLED"
      : variant === "go"
        ? "GAME ON"
        : variant === "almost"
          ? "ALMOST"
          : "NOT YET";

  return (
    <div
      className={`status-badge status-badge--${variant}${large ? " status-badge--large" : ""}`}
    >
      <span className="status-badge__dot" />
      {label}
    </div>
  );
}
