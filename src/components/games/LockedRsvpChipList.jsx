import HoverTooltip from "../ui/HoverTooltip.jsx";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function LockedRsvpChipList({
  entries,
  profileId,
  checkedInUserIds,
  viewerCheckedIn = false,
  emptyLabel,
  disabled = false,
  onSetBailed,
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
        const canMark = viewerCheckedIn && Boolean(profileId) && !disabled && !isYou && !isHere;

        if (!canMark) {
          if (entry.bailed) {
            return (
              <HoverTooltip
                key={entry.userId}
                text="Flaked"
                className={cx("chip", isYou && "chip--you", "chip--bailed")}
              >
                {entry.name}
                {entry.plusOnes > 0 && <span className="chip__muted"> +{entry.plusOnes}</span>}
              </HoverTooltip>
            );
          }

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
        }

        const tooltip = entry.bailed ? "Flaked · click to undo" : "Flaked";

        return (
          <HoverTooltip
            key={entry.userId}
            as="button"
            type="button"
            text={tooltip}
            className={cx("locked-rsvp-chip", entry.bailed && "locked-rsvp-chip--bailed")}
            aria-label={
              entry.bailed
                ? `Undo flaked mark for ${entry.name}`
                : `Mark ${entry.name} as flaked`
            }
            onClick={() => onSetBailed?.(entry, !entry.bailed)}
          >
            <span className="locked-rsvp-chip__label">
              {entry.name}
              {entry.plusOnes > 0 && <span className="chip__muted"> +{entry.plusOnes}</span>}
            </span>
          </HoverTooltip>
        );
      })}
    </div>
  );
}
