import { displayPlayerName, formatChipExtras, formatKitSuffix } from "../../utils/format.js";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function LockedRsvpChipList({
  entries,
  profileId,
  checkedInUserIds,
  emptyLabel = "no one signed up",
  className = "",
}) {
  if (entries.length === 0) {
    return <p className="chip-list__empty">{emptyLabel}</p>;
  }

  const checkedIn = checkedInUserIds ?? new Set();

  return (
    <div className={cx("chip-list", className)}>
      {entries.map((entry) => {
        const isYou = entry.userId === profileId;
        const isHere = checkedIn.has(entry.userId);
        const label = displayPlayerName(entry, profileId);
        const kitSuffix = formatKitSuffix(entry);
        const extras = formatChipExtras(entry);

        return (
          <span
            key={entry.userId}
            className={cx("chip", isYou && "chip--you")}
            title={isHere ? `${label} is checked in${kitSuffix}` : undefined}
          >
            {label}
            {extras && <span className="chip__muted">{extras}</span>}
          </span>
        );
      })}
    </div>
  );
}
