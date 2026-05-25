import LockedRsvpChipList from "./LockedRsvpChipList.jsx";
import GameDetailPlayersSection from "./GameDetailPlayersSection.jsx";
import GameWalkInsSection from "./GameWalkInsSection.jsx";
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
  const checkedInUserIds = new Set(checkInEntries.map((entry) => entry.userId));

  const inPickupWindow = isLive || isEnded;

  return (
    <div className="game-card__phase-stack">
      <section className={`game-card__phase game-card__phase--rsvp${inPickupWindow ? " game-card__phase--exit" : ""}`}>
        <div className="game-detail-body">
          <ProgressBar count={rsvpCount} target={game.target} label="RSVP" />
          <GameDetailPlayersSection
            label="Signed up"
            entries={rsvpEntries}
            profileId={profile?.id}
            emptyLabel="no signups yet"
          />
        </div>
      </section>

      <section className={`game-card__phase game-card__phase--live${inPickupWindow ? " game-card__phase--active" : ""}`}>
        <div className="game-detail-body">
          <div className="game-detail-players game-detail-players--locked">
            <p className="game-detail-players__label">
              RSVP locked · {rsvpCount} signed up
            </p>
            <LockedRsvpChipList
              entries={rsvpEntries}
              profileId={profile?.id}
              checkedInUserIds={checkedInUserIds}
              emptyLabel="no one signed up"
            />
          </div>

          <ProgressBar count={checkInCount} target={game.target} label={isEnded ? "Attended" : "Here now"} />
          <GameDetailPlayersSection
            label="Who's here"
            entries={checkInEntries}
            profileId={profile?.id}
            emptyLabel="no one checked in yet"
          />

          {!isEnded && (
            <GameWalkInsSection
              entries={walkInEntries}
              disabled={!profile || saving}
              onAdd={(name) => onAddWalkIn?.(game.id, name)}
              onRemove={(guestId) => onRemoveWalkIn?.(game.id, guestId)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
