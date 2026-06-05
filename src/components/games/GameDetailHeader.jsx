import MetaRow from "../ui/MetaRow.jsx";
import GameStartStatus from "./GameStartStatus.jsx";
import StatusBadge from "./StatusBadge.jsx";

export default function GameDetailHeader({
  game,
  count,
  cancelled,
  isLive = false,
  isEnded = false,
  onAddressCopy,
  adminAction = null,
}) {
  return (
    <header className="game-detail-header">
      <div className="game-detail-header__row-wrap">
        <div className="game-detail-header__row">
          <div className="game-detail-header__title-row">
            <h2 className="game-detail-header__title">{game.name}</h2>
            {!cancelled && isLive ? (
              <span className="game-detail-header__live-badge">Live</span>
            ) : null}
            {!cancelled && isEnded ? (
              <span className="game-detail-header__ended-badge">Ended</span>
            ) : null}
            <StatusBadge count={count} target={game.target} cancelled={cancelled} />
            {adminAction ? (
              <span className="game-detail-header__admin-action">{adminAction}</span>
            ) : null}
          </div>
        </div>
      </div>
      <MetaRow
        game={game}
        className="game-detail-header__meta"
        allowAddressCopy
        onAddressCopy={onAddressCopy}
      />
      {!cancelled && !isLive && !isEnded ? (
        <GameStartStatus
          game={game}
          className="game-detail-header__countdown"
          pillClassName="game-detail-header__starting-soon"
        />
      ) : null}
    </header>
  );
}
