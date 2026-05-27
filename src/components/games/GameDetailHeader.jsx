import MetaRow from "../ui/MetaRow.jsx";
import CommitStatusPill from "./CommitStatusPill.jsx";
import GameStartStatus from "./GameStartStatus.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

function HeaderCaret({ expanded }) {
  return (
    <span
      className={`game-detail-header__caret${expanded ? " game-detail-header__caret--open" : ""}`}
      aria-hidden="true"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 4.5L6 8L9.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function GameDetailHeader({
  game,
  count,
  cancelled,
  isLive = false,
  isEnded = false,
  rsvpd = false,
  checkedIn = false,
  collapsible = false,
  expanded = false,
  onToggle,
  onAddressCopy,
}) {
  const headerClass = [
    "game-detail-header",
    collapsible ? "game-detail-header--collapsible" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const row = (
    <div className="game-detail-header__row">
      <div className="game-detail-header__title-row">
        <h2 className="game-detail-header__title">{game.name}</h2>
        <CommitStatusPill
          isLive={isLive}
          rsvpd={rsvpd}
          checkedIn={checkedIn}
          cancelled={cancelled}
          reserveSpace
        />
        <StatusBadge count={count} target={game.target} cancelled={cancelled} />
      </div>
      <span className="game-detail-header__caret-slot">
        {collapsible ? <HeaderCaret expanded={expanded} /> : null}
      </span>
    </div>
  );

  return (
    <header className={headerClass}>
      {collapsible ? (
        <button
          type="button"
          className="game-detail-header__row-wrap"
          onMouseDown={suppressMouseFocus}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse game details" : "Expand game details"}
        >
          {row}
        </button>
      ) : (
        <div className="game-detail-header__row-wrap">{row}</div>
      )}
      <MetaRow
        game={game}
        className="game-detail-header__meta"
        allowAddressCopy
        onAddressCopy={onAddressCopy}
      />
      {!cancelled && isLive ? (
        <span className="game-detail-header__live">Live now</span>
      ) : null}
      {!cancelled && !isLive && !isEnded ? (
        <GameStartStatus
          game={game}
          className="game-detail-header__countdown"
          pillClassName="game-detail-header__starting-soon"
        />
      ) : null}
      {!cancelled && isEnded ? (
        <span className="game-detail-header__ended">Ended</span>
      ) : null}
    </header>
  );
}
