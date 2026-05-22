import { Link } from "react-router-dom";
import Button from "../ui/Button.jsx";
import MetaRow from "../ui/MetaRow.jsx";
import LocationDisplay from "./LocationDisplay.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { formatGameLocation } from "../../utils/location.js";

export default function GameListItem({
  game,
  count,
  isLive,
  rsvpd,
  checkedIn,
  isAdmin,
  onEditGame,
}) {
  const cancelled = game.status === "cancelled";
  const { display: locationDisplay, tooltip: locationTooltip, city } = formatGameLocation(game);

  return (
    <Link
      to={`/games/${game.id}`}
      className={`game-list-item surface${cancelled ? " game-list-item--cancelled" : ""}`}
    >
      <div className="game-list-item__top">
        <div className="game-list-item__title-wrap">
          <h2 className="game-list-item__title">{game.name}</h2>
          {isAdmin && (
            <Button
              variant="ghost"
              className="game-card__edit-btn"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEditGame(game);
              }}
              aria-label={`Edit ${game.name}`}
            >
              Edit
            </Button>
          )}
        </div>
        <div className="game-list-item__badges">
          {!cancelled && (checkedIn || rsvpd) && (
            <span className="game-card__status-pill">{isLive && checkedIn ? "HERE" : "IN"}</span>
          )}
          <StatusBadge count={count} target={game.target} cancelled={cancelled} />
        </div>
      </div>

      <p className="meta-row meta-row--location game-list-item__meta">
        <LocationDisplay display={locationDisplay} tooltip={locationTooltip} />
        {city ? <span className="meta-row__city game-card__meta-city"> · {city}</span> : null}
      </p>

      <MetaRow game={game} scheduleClassName="game-list-item__detail" />

      <div className="game-list-item__footer">
        <span className="game-list-item__count">
          {isLive ? "here now" : "signed up"} · {count} / {game.target}
        </span>
        {isLive && <span className="game-list-item__live">live now</span>}
        <span className="game-list-item__cta" aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}
