import GameCardBody from "./GameCardBody.jsx";
import GameDetailHeader from "./GameDetailHeader.jsx";

export default function GameCard({
  profile,
  game,
  isLive,
  rsvpCount,
  rsvpEntries,
  checkInCount,
  checkInEntries,
  embedded = false,
  className = "",
}) {
  const cancelled = game.status === "cancelled";
  const activeCount = isLive ? checkInCount : rsvpCount;
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
    rsvpCount,
    rsvpEntries,
    checkInCount,
    checkInEntries,
  };

  return (
    <div className={cardClass}>
      <GameDetailHeader game={game} count={activeCount} cancelled={cancelled} />
      {!cancelled && <GameCardBody {...bodyProps} />}
    </div>
  );
}

export { default as GameCardBody } from "./GameCardBody.jsx";
