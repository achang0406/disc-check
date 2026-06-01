import GameCardBody from "./GameCardBody.jsx";
import GameDetailHeader from "./GameDetailHeader.jsx";
import CallPanel from "./CallPanel.jsx";

export default function GameCard({
  profile,
  game,
  isLive,
  isEnded = false,
  rsvpd = false,
  checkedIn = false,
  rsvpCount,
  rsvpEntries,
  checkInCount,
  checkInEntries,
  walkInEntries,
  onAddWalkIn,
  onRemoveWalkIn,
  saving = false,
  embedded = false,
  className = "",
  onAddressCopy,
}) {
  const cancelled = game.status === "cancelled";
  const activeCount = isLive || isEnded ? checkInCount : rsvpCount;
  const cardClass = [
    "game-card",
    embedded ? "game-card--embedded" : "surface",
    "game-card--detail",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const bodyProps = {
    profile,
    game,
    isLive,
    isEnded,
    rsvpCount,
    rsvpEntries,
    checkInCount,
    checkInEntries,
    walkInEntries,
    checkedIn,
    onAddWalkIn,
    onRemoveWalkIn,
    saving,
  };

  return (
    <div className={cardClass}>
      <GameDetailHeader
        game={game}
        count={activeCount}
        cancelled={cancelled}
        isLive={isLive}
        isEnded={isEnded}
        rsvpd={rsvpd}
        checkedIn={checkedIn}
        onAddressCopy={onAddressCopy}
      />
      {!cancelled && (
        <CallPanel
          count={activeCount}
          target={game.target}
          cancelled={cancelled}
          isLive={isLive}
          isEnded={isEnded}
          rsvpd={rsvpd}
          checkedIn={checkedIn}
          compact={isLive}
        />
      )}
      {!cancelled && <GameCardBody {...bodyProps} />}
    </div>
  );
}

export { default as GameCardBody } from "./GameCardBody.jsx";
