import LockedRsvpChipList from "./LockedRsvpChipList.jsx";
import WhoIsHereSection from "./WhoIsHereSection.jsx";

export default function LivePickupPanel({
  profile,
  isEnded = false,
  rsvpEntries,
  checkInEntries,
  walkInEntries = [],
  disabled = false,
  showWalkInInput = true,
  onAddWalkIn,
  onRemoveWalkIn,
}) {
  const hasRsvps = rsvpEntries.length > 0;
  const hasCheckIns = checkInEntries.length > 0;
  const hasWalkIns = walkInEntries.length > 0;
  const hasAnyoneHere = hasCheckIns || hasWalkIns;
  const checkedInUserIds = new Set(checkInEntries.map((entry) => entry.userId));
  const hereLabel = isEnded ? "Attended" : "Who's here";

  const showEmptyLead = !isEnded && !hasAnyoneHere && !hasRsvps;
  const showWaitingLead = !isEnded && !hasAnyoneHere && hasRsvps;
  const showEndedEmptyLead = isEnded && !hasAnyoneHere;
  const showHereSection = hasAnyoneHere || (!isEnded && showWalkInInput);

  return (
    <div className="live-pickup">
      {showWaitingLead && (
        <p className="live-pickup__waiting">Waiting for first check-in</p>
      )}

      {showEmptyLead && (
        <p className="live-pickup__lead">No one here yet — check in below to start the count.</p>
      )}

      {showEndedEmptyLead && (
        <p className="live-pickup__lead">No one attended this game.</p>
      )}

      {showHereSection && (
        <WhoIsHereSection
          label={hereLabel}
          checkInEntries={checkInEntries}
          walkInEntries={walkInEntries}
          profileId={profile?.id}
          disabled={disabled}
          showWalkInInput={!isEnded && showWalkInInput}
          allowWalkInRemove={!isEnded}
          inputPlaceholder="Walk-in name"
          onAddWalkIn={onAddWalkIn}
          onRemoveWalkIn={onRemoveWalkIn}
        />
      )}

      {hasRsvps && (
        <div className="live-pickup__rsvp-group">
          <p className="game-detail-players__label">Signed up</p>
          <LockedRsvpChipList
            entries={rsvpEntries}
            profileId={profile?.id}
            checkedInUserIds={checkedInUserIds}
          />
        </div>
      )}
    </div>
  );
}
