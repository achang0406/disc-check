import LivePickupPanel from "./LivePickupPanel.jsx";
import GameDetailPlayersSection from "./GameDetailPlayersSection.jsx";
import GameDetailHeader from "./GameDetailHeader.jsx";
import ProgressBar from "./ProgressBar.jsx";

export default function GameCommitStrip({
  profile,
  game,
  isLive,
  isEnded = false,
  rsvpd = false,
  checkedIn = false,
  count,
  rsvpCount,
  rsvpEntries,
  checkInEntries,
  walkInEntries = [],
  expanded,
  onToggleExpanded,
  onAddressCopy,
  onAddWalkIn,
  onRemoveWalkIn,
  saving = false,
}) {
  const cancelled = game.status === "cancelled";
  const inPickupWindow = isLive || isEnded;

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
        isEnded={isEnded}
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
          label={isLive ? "Here now" : isEnded ? "Attended" : "RSVP"}
        />

        <div className="game-commit-strip__expandable" aria-hidden={!expanded}>
          <div className="game-commit-strip__expandable-inner">
            {!cancelled && !inPickupWindow && (
              <GameDetailPlayersSection
                label="Signed up"
                entries={rsvpEntries}
                profileId={profile?.id}
                emptyLabel="no signups yet"
              />
            )}

            {!cancelled && inPickupWindow && (
              <LivePickupPanel
                profile={profile}
                isEnded={isEnded}
                rsvpEntries={rsvpEntries}
                checkInEntries={checkInEntries}
                walkInEntries={walkInEntries}
                disabled={!profile || saving}
                showWalkInInput={expanded}
                onAddWalkIn={(name) => onAddWalkIn?.(game.id, name)}
                onRemoveWalkIn={(guestId) => onRemoveWalkIn?.(game.id, guestId)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
