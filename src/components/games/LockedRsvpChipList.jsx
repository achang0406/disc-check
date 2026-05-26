import { displayPlayerName } from "../../utils/format.js";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function LockedRsvpChipList({
  entries,
  profileId,
  checkedInUserIds,
  emptyLabel,
  className = "",
}) {
  if (entries.length === 0) {
    return <p className="chip-list__empty">{emptyLabel}</p>;
  }

  const checkedIn = checkedInUserIds ?? new Set();

  return (
    <div className={cx("chip-list", "chip-list--locked-rsvp", className)}>
      {entries.map((entry) => {
        const isYou = entry.userId === profileId;
        const isHere = checkedIn.has(entry.userId);
        const label = displayPlayerName(entry, profileId);

        return (
          <span
            key={entry.userId}
            className={cx("chip", isYou && "chip--you")}
            title={isHere ? `${label} is checked in` : undefined}
          >
            {label}
            {entry.plusOnes > 0 && <span className="chip__muted"> +{entry.plusOnes}</span>}
          </span>
        );
      })}
    </div>
  );
}
