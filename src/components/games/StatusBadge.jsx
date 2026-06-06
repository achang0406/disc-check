import { getGameBadgeVariant } from "../../utils/gameBadge.js";

export default function StatusBadge({ count, target, cancelled }) {
  const variant = getGameBadgeVariant({ count, target, cancelled });
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
      className={`status-badge status-badge--${variant}`}
    >
      <span className="status-badge__dot" />
      {label}
    </div>
  );
}
