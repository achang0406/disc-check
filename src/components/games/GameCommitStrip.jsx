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
}) {
  const cancelled = game.status === "cancelled";
  const playerEntries = isLive ? checkInEntries : rsvpEntries;

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
            {!cancelled && (
              <GameDetailPlayersSection
                label={isLive ? "Who's here" : "Signed up"}
                entries={playerEntries}
                profileId={profile?.id}
                emptyLabel={isLive ? "no one checked in yet" : "no signups yet"}
              />
            )}

            {isLive && (
              <p className="game-commit-strip__locked-note">
                <span aria-hidden="true">🔒</span> RSVP locked · {rsvpCount} signed up before start
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
