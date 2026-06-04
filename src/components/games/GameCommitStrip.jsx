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
  onAddressCopy,
  onAddWalkIn,
  onRemoveWalkIn,
  saving = false,
}) {
  const cancelled = game.status === "cancelled";
  const inPickupWindow = isLive || isEnded;

  return (
    <section className="game-commit-strip" aria-label="Game status and RSVP">
      <GameDetailHeader
        game={game}
        count={count}
        cancelled={cancelled}
        isLive={isLive}
        isEnded={isEnded}
        rsvpd={rsvpd}
        checkedIn={checkedIn}
        onAddressCopy={onAddressCopy}
      />

      <div className="game-detail-body">
        <ProgressBar
          count={count}
          target={game.target}
          label={isLive ? "Here now" : isEnded ? "Attended" : "Rsvp"}
        />

        <div className="game-commit-strip__players">
          {!cancelled && !inPickupWindow && (
            <GameDetailPlayersSection
              entries={rsvpEntries}
              profileId={profile?.id}
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
              showWalkInInput={!isEnded}
              onAddWalkIn={(name) => onAddWalkIn?.(game.id, name)}
              onRemoveWalkIn={(guestId) => onRemoveWalkIn?.(game.id, guestId)}
            />
          )}
        </div>
      </div>
    </section>
  );
}
