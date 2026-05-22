import ChipList from "../ui/ChipList.jsx";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function GameDetailPlayersSection({
  label,
  entries,
  profileId,
  emptyLabel,
  className = "",
}) {
  return (
    <div className={cx("game-detail-players", className)}>
      <p className="game-detail-players__label">{label}</p>
      <ChipList entries={entries} profileId={profileId} emptyLabel={emptyLabel} />
    </div>
  );
}
