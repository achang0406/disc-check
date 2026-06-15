import Button from "../ui/Button.jsx";
import StatusBadge from "./StatusBadge.jsx";
import ProgressBar from "./ProgressBar.jsx";
import GameDetailPlayersSection from "./GameDetailPlayersSection.jsx";
import CommitExtras from "./CommitExtras.jsx";

const EMPTY_GAME_TARGET = 8;

export default function GameCardEmptyState({
  isAdmin = false,
  onAddGame,
  addGameDisabled = false,
  addGameDisabledReason = "Maximum 7 games per group",
}) {
  return (
    <div className="game-detail-panel surface game-commit-card game-card-empty" aria-label="No games">
      <section className="game-commit-strip">
        <header className="game-detail-header">
          <div className="game-detail-header__row-wrap">
            <div className="game-detail-header__row">
              <div className="game-detail-header__title-row">
                <h2 className="game-detail-header__title">No games yet</h2>
                <StatusBadge count={0} target={EMPTY_GAME_TARGET} cancelled={false} />
              </div>
            </div>
          </div>
          <p className="meta-row meta-row--location game-detail-header__meta game-card-empty__meta">
            <span className="meta-row__text">
              {isAdmin ? "Add a weekly game to get started" : "Nothing scheduled yet"}
            </span>
          </p>
        </header>

        <div className="game-detail-body">
          <ProgressBar count={0} target={EMPTY_GAME_TARGET} label="Rsvp" />

          <div className="game-commit-strip__players">
            <GameDetailPlayersSection
              entries={[]}
              emptyLabel={isAdmin ? "Games show up here once added." : "Be the first to sign up."}
            />
          </div>
        </div>

        <div className="game-commit-strip__actions">
          {isAdmin ? (
            <Button
              variant="primary"
              block
              className="game-detail-panel__cta"
              onClick={onAddGame}
              disabled={addGameDisabled}
              title={addGameDisabled ? addGameDisabledReason : undefined}
            >
              Add game
            </Button>
          ) : (
            <>
              <CommitExtras
                plusOnes={0}
                onPlusOnesChange={() => {}}
                bringingKit={false}
                onBringingKitChange={() => {}}
                disabled
              />
              <Button variant="primary" block className="game-detail-panel__cta" disabled>
                Count me in
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
