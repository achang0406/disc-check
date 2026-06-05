import LivePickupPanel from "./LivePickupPanel.jsx";
import GameDetailPlayersSection from "./GameDetailPlayersSection.jsx";
import GameDetailHeader from "./GameDetailHeader.jsx";
import GameDetailActions from "./GameDetailActions.jsx";
import WhoIsHereSection from "./WhoIsHereSection.jsx";
import ProgressBar from "./ProgressBar.jsx";
import { getDailyWalkInPlaceholder } from "../../constants/rotatingPlaceholders.js";

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
  adminAction = null,
  actionProps = null,
  walkthroughAnchorActive = false,
}) {
  const cancelled = game.status === "cancelled";
  const inPickupWindow = isLive || isEnded;
  const showPregameWalkInChips = !cancelled && !inPickupWindow && rsvpd && walkInEntries.length > 0;
  const showWalkInInput =
    !cancelled &&
    !isEnded &&
    ((isLive && checkedIn) || (!isLive && rsvpd));
  const walkInPlaceholder = getDailyWalkInPlaceholder(isLive);

  return (
    <section className="game-commit-strip" aria-label="Game status and RSVP">
      <GameDetailHeader
        game={game}
        count={count}
        cancelled={cancelled}
        isLive={isLive}
        isEnded={isEnded}
        onAddressCopy={onAddressCopy}
        adminAction={adminAction}
        walkthroughAnchorActive={walkthroughAnchorActive}
      />

      <div className="game-detail-body">
        <ProgressBar
          count={count}
          target={game.target}
          label={isLive ? "Here now" : isEnded ? "Attended" : "Rsvp"}
        />

        <div className="game-commit-strip__players">
          {!cancelled && !inPickupWindow && (
            <>
              <GameDetailPlayersSection
                entries={rsvpEntries}
                profileId={profile?.id}
              />
              {showPregameWalkInChips && (
                <WhoIsHereSection
                  walkInEntries={walkInEntries}
                  profileId={profile?.id}
                  disabled={!profile || saving}
                  allowWalkInRemove
                  onRemoveWalkIn={(guestId) => onRemoveWalkIn?.(game.id, guestId)}
                />
              )}
            </>
          )}

          {!cancelled && inPickupWindow && (
            <LivePickupPanel
              profile={profile}
              isEnded={isEnded}
              rsvpEntries={rsvpEntries}
              checkInEntries={checkInEntries}
              walkInEntries={walkInEntries}
              disabled={!profile || saving}
              onRemoveWalkIn={(guestId) => onRemoveWalkIn?.(game.id, guestId)}
            />
          )}
        </div>
      </div>

      {actionProps ? (
        <GameDetailActions
          {...actionProps}
          className="game-commit-strip__actions"
          showWalkInInput={showWalkInInput}
          walkInPlaceholder={walkInPlaceholder}
          onAddWalkIn={(name) => onAddWalkIn?.(game.id, name)}
          walkInDisabled={!profile || saving}
          walkthroughAnchorActive={walkthroughAnchorActive}
        />
      ) : walkthroughAnchorActive ? (
        <div
          className="game-commit-strip__actions game-commit-strip__tour-anchor"
          data-walkthrough-target="walk-ins"
          aria-hidden
        />
      ) : null}
    </section>
  );
}
