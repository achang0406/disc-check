import ChipList from "../ui/ChipList.jsx";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function GameDetailPlayersSection({
  label,
  entries,
  walkInEntries = [],
  profileId,
  emptyLabel = "Be the first to sign up.",
  className = "",
  allowWalkInRemove = false,
  walkInRemoveDisabled = false,
  onRemoveWalkIn,
}) {
  const isEmpty = entries.length === 0 && walkInEntries.length === 0;

  return (
    <div className={cx("game-detail-players", isEmpty && "game-detail-players--empty", className)}>
      {label ? <p className="game-detail-players__label">{label}</p> : null}
      <ChipList
        entries={entries}
        walkInEntries={walkInEntries}
        profileId={profileId}
        emptyLabel={emptyLabel}
        allowWalkInRemove={allowWalkInRemove}
        walkInRemoveDisabled={walkInRemoveDisabled}
        onRemoveWalkIn={onRemoveWalkIn}
      />
    </div>
  );
}
