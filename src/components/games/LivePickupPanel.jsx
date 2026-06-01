import LockedRsvpChipList from "./LockedRsvpChipList.jsx";
import WhoIsHereSection from "./WhoIsHereSection.jsx";

function entryHeadcount(entry) {
  return 1 + (entry.plusOnes || 0);
}

function countWaitingOnRsvps(rsvpEntries, checkedInUserIds) {
  return rsvpEntries
    .filter((entry) => !checkedInUserIds.has(entry.userId))
    .reduce((sum, entry) => sum + entryHeadcount(entry), 0);
}

export default function LivePickupPanel({
  profile,
  isEnded = false,
  hereCount = 0,
  rsvpCount = 0,
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
  const waitingCount = countWaitingOnRsvps(rsvpEntries, checkedInUserIds);
  const hereLabel = isEnded ? "Attended" : "Who's here";

  const showEndedEmptyLead = isEnded && !hasAnyoneHere;
  const showHereSection = hasAnyoneHere || (!isEnded && showWalkInInput);

  let leadCopy = null;
  if (!isEnded) {
    if (hasAnyoneHere && waitingCount > 0) {
      leadCopy = `${hereCount} here · waiting on ${waitingCount} more signed up`;
    } else if (hasAnyoneHere) {
      leadCopy =
        hereCount === 1
          ? "1 here · everyone signed up has arrived"
          : `${hereCount} here · everyone signed up has arrived`;
    } else if (hasRsvps) {
      leadCopy =
        rsvpCount === 1
          ? "0 here · 1 signed up — waiting for first check-in"
          : `0 here · ${rsvpCount} signed up — waiting for first check-in`;
    } else {
      leadCopy = "No one here yet — check in below to start the count.";
    }
  }

  return (
    <div className="live-pickup">
      {leadCopy ? <p className="live-pickup__lead">{leadCopy}</p> : null}

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
