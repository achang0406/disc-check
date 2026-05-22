import LockedRsvpChipList from "./LockedRsvpChipList.jsx";
import GameDetailPlayersSection from "./GameDetailPlayersSection.jsx";
import ProgressBar from "./ProgressBar.jsx";

export default function GameCardBody({
  profile,
  game,
  isLive,
  rsvpCount,
  rsvpEntries,
  checkInCount,
  checkInEntries,
  onSetRsvpBail,
  saving = false,
}) {
  const checkedInUserIds = new Set(checkInEntries.map((entry) => entry.userId));

  return (
    <div className="game-card__phase-stack">
      <section className={`game-card__phase game-card__phase--rsvp${isLive ? " game-card__phase--exit" : ""}`}>
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

      <section className={`game-card__phase game-card__phase--live${isLive ? " game-card__phase--active" : ""}`}>
        <div className="game-detail-body">
          <div className="game-card__locked-rsvp">
            <p className="game-detail-players__label game-detail-players__label--locked">
              <span aria-hidden="true">🔒</span> RSVP locked · {rsvpCount} signed up
            </p>
            <LockedRsvpChipList
              entries={rsvpEntries}
              profileId={profile?.id}
              checkedInUserIds={checkedInUserIds}
              emptyLabel="no one signed up"
              disabled={!profile || saving}
              onSetBailed={(entry, bailed) => onSetRsvpBail?.(game.id, entry, bailed)}
            />
          </div>

          <ProgressBar count={checkInCount} target={game.target} label="Here now" />
          <GameDetailPlayersSection
            label="Who's here"
            entries={checkInEntries}
            profileId={profile?.id}
            emptyLabel="no one checked in yet"
          />
        </div>
      </section>
    </div>
  );
}
