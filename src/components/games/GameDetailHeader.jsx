import MetaRow from "../ui/MetaRow.jsx";
import StatusBadge from "./StatusBadge.jsx";

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
  collapsible = false,
  expanded = false,
  onToggle,
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
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse game details" : "Expand game details"}
        >
          {row}
        </button>
      ) : (
        <div className="game-detail-header__row-wrap">{row}</div>
      )}
      <MetaRow game={game} className="game-detail-header__meta" />
    </header>
  );
}
