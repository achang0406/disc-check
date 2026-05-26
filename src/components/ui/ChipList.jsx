import { displayPlayerName } from "../../utils/format.js";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function ChipList({
  entries,
  profileId,
  emptyLabel,
  className = "",
}) {
  if (entries.length === 0) {
    return <p className="chip-list__empty">{emptyLabel}</p>;
  }

  return (
    <div className={cx("chip-list", className)}>
      {entries.map((entry) => {
        const isYou = entry.userId === profileId;
        const label = displayPlayerName(entry, profileId);
        return (
          <span
            key={entry.userId}
            className={cx("chip", isYou && "chip--you")}
            title={
              entry.plusOnes > 0
                ? `${label} + ${entry.plusOnes} guest${entry.plusOnes !== 1 ? "s" : ""}`
                : label
            }
          >
            {label}
            {entry.plusOnes > 0 && <span className="chip__muted"> +{entry.plusOnes}</span>}
          </span>
        );
      })}
    </div>
  );
}
