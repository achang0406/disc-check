import { displayPlayerName, formatChipExtras, formatKitSuffix } from "../../utils/format.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function ChipList({
  entries,
  walkInEntries = [],
  profileId,
  emptyLabel,
  className = "",
  allowWalkInRemove = false,
  walkInRemoveDisabled = false,
  onRemoveWalkIn,
}) {
  const hasPlayers = entries.length > 0;
  const hasWalkIns = walkInEntries.length > 0;

  if (!hasPlayers && !hasWalkIns) {
    return <p className="chip-list__empty">{emptyLabel}</p>;
  }

  return (
    <div className={cx("chip-list", className)}>
      {entries.map((entry) => {
        const isYou = entry.userId === profileId;
        const label = displayPlayerName(entry, profileId);
        const kitSuffix = formatKitSuffix(entry);
        const extras = formatChipExtras(entry);
        return (
          <span
            key={entry.userId}
            className={cx("chip", isYou && "chip--you")}
            title={
              entry.plusOnes > 0
                ? `${label} + ${entry.plusOnes} guest${entry.plusOnes !== 1 ? "s" : ""}${kitSuffix}`
                : `${label}${kitSuffix}`
            }
          >
            {label}
            {extras && <span className="chip__muted">{extras}</span>}
          </span>
        );
      })}

      {walkInEntries.map((entry) => {
        const removable = allowWalkInRemove && !walkInRemoveDisabled;

        return (
          <span
            key={entry.id}
            className={cx("chip", "chip--walk-in", removable && "chip--removable")}
          >
            {entry.name}
            {removable && (
              <button
                type="button"
                className="chip__remove"
                aria-label={`Remove ${entry.name}`}
                onMouseDown={suppressMouseFocus}
                onClick={() => onRemoveWalkIn?.(entry.id)}
              >
                ×
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
