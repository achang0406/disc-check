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

        return (
          <span
            key={entry.userId}
            className={cx("chip", isYou && "chip--you")}
            title={isHere ? `${entry.name} is checked in` : undefined}
          >
            {entry.name}
            {entry.plusOnes > 0 && <span className="chip__muted"> +{entry.plusOnes}</span>}
          </span>
        );
      })}
    </div>
  );
}
