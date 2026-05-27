import LivePickupPanel from "./LivePickupPanel.jsx";
import GameDetailPlayersSection from "./GameDetailPlayersSection.jsx";
import ProgressBar from "./ProgressBar.jsx";

export default function GameCardBody({
  profile,
  game,
  isLive,
  isEnded = false,
  rsvpCount,
  rsvpEntries,
  checkInCount,
  checkInEntries,
  walkInEntries = [],
  onAddWalkIn,
  onRemoveWalkIn,
  saving = false,
}) {
  const inPickupWindow = isLive || isEnded;

  return (
    <div className="game-card__phase-stack">
      <section className={`game-card__phase game-card__phase--rsvp${inPickupWindow ? " game-card__phase--exit" : ""}`}>
        <div className="game-detail-body">
          <ProgressBar count={rsvpCount} target={game.target} label="Rsvp" />
          <GameDetailPlayersSection
            entries={rsvpEntries}
            profileId={profile?.id}
          />
        </div>
      </section>

      <section className={`game-card__phase game-card__phase--live${inPickupWindow ? " game-card__phase--active" : ""}`}>
        <div className="game-detail-body">
          <ProgressBar count={checkInCount} target={game.target} label={isEnded ? "Attended" : "Here now"} />
          <LivePickupPanel
            profile={profile}
            isEnded={isEnded}
            rsvpEntries={rsvpEntries}
            checkInEntries={checkInEntries}
            walkInEntries={walkInEntries}
            disabled={!profile || saving}
            onAddWalkIn={(name) => onAddWalkIn?.(game.id, name)}
            onRemoveWalkIn={(guestId) => onRemoveWalkIn?.(game.id, guestId)}
          />
        </div>
      </section>
    </div>
  );
}
