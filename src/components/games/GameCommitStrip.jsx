import LockedRsvpChipList from "./LockedRsvpChipList.jsx";
import GameDetailPlayersSection from "./GameDetailPlayersSection.jsx";
import GameDetailHeader from "./GameDetailHeader.jsx";
import ProgressBar from "./ProgressBar.jsx";

export default function GameCommitStrip({
  profile,
  game,
  isLive,
  rsvpd = false,
  checkedIn = false,
  count,
  rsvpCount,
  rsvpEntries,
  checkInEntries,
  expanded,
  onToggleExpanded,
  onAddressCopy,
  onSetRsvpBail,
  saving = false,
}) {
  const cancelled = game.status === "cancelled";
  const checkedInUserIds = new Set(checkInEntries.map((entry) => entry.userId));

  return (
    <section
      className={`game-commit-strip${expanded ? " game-commit-strip--expanded" : ""}`}
      aria-label="Game status and RSVP"
    >
      <GameDetailHeader
        game={game}
        count={count}
        cancelled={cancelled}
        isLive={isLive}
        rsvpd={rsvpd}
        checkedIn={checkedIn}
        collapsible
        expanded={expanded}
        onToggle={onToggleExpanded}
        onAddressCopy={onAddressCopy}
      />

      <div className="game-detail-body">
        <ProgressBar
          count={count}
          target={game.target}
          label={isLive ? "Here now" : "RSVP"}
        />

        <div className="game-commit-strip__expandable" aria-hidden={!expanded}>
          <div className="game-commit-strip__expandable-inner">
            {!cancelled && !isLive && (
              <GameDetailPlayersSection
                label="Signed up"
                entries={rsvpEntries}
                profileId={profile?.id}
                emptyLabel="no signups yet"
              />
            )}

            {!cancelled && isLive && (
              <>
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

                <GameDetailPlayersSection
                  label="Who's here"
                  entries={checkInEntries}
                  profileId={profile?.id}
                  emptyLabel="no one checked in yet"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
