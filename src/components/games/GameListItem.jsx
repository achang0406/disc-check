import { Link } from "react-router-dom";
import Button from "../ui/Button.jsx";
import MetaRow from "../ui/MetaRow.jsx";
import CommitStatusPill from "./CommitStatusPill.jsx";
import GameStartCountdown from "./GameStartCountdown.jsx";
import StatusBadge from "./StatusBadge.jsx";

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
          <CommitStatusPill
            isLive={isLive}
            rsvpd={rsvpd}
            checkedIn={checkedIn}
            cancelled={cancelled}
          />
          <StatusBadge count={count} target={game.target} cancelled={cancelled} />
        </div>
      </div>

      <MetaRow game={game} className="game-list-item__meta" />

      <div className="game-list-item__footer">
        <span className="game-list-item__count">
          {isLive ? "here now" : "signed up"} · {count} / {game.target}
        </span>
        {isLive ? (
          <span className="game-list-item__live">live now</span>
        ) : (
          !cancelled && <GameStartCountdown game={game} className="game-list-item__countdown" />
        )}
        <span className="game-list-item__cta" aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}
