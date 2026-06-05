import Button from "../ui/Button.jsx";
import CommitExtras from "./CommitExtras.jsx";
import { WalkInAddForm } from "./WhoIsHereSection.jsx";

export default function GameDetailActions({
  game,
  isLive,
  rsvpd,
  checkedIn,
  saving,
  plusOnes,
  onPlusOnesChange,
  bringingKit,
  onBringingKitChange,
  herePlusOnes,
  onHerePlusOnesChange,
  hereBringingKit,
  onHereBringingKitChange,
  onRequestRsvp,
  onCancel,
  onRequestCheckIn,
  onCheckOut,
  isEnded = false,
  className = "game-detail-panel__actions",
  showWalkInInput = false,
  walkInPlaceholder = "",
  onAddWalkIn,
  walkInDisabled = false,
  walkthroughAnchorActive = false,
}) {
  const cancelled = game.status === "cancelled";
  const committed = isLive ? checkedIn : rsvpd;

  if (isEnded || cancelled) return null;

  const ctaLabel = isLive
    ? saving
      ? "..."
      : checkedIn
        ? "Leave"
        : "I'm here"
    : saving
      ? "..."
      : rsvpd
        ? "Cancel"
        : "Count me in";

  const ctaVariant = committed ? "secondary" : "primary";
  const ctaDisabled = saving;
  const ctaSavingClass = saving && !committed ? " game-detail-panel__cta--saving" : "";

  const handleClick = () => {
    if (saving) return;
    if (isLive) {
      if (checkedIn) {
        onCheckOut(game.id);
        return;
      }
      onRequestCheckIn(game, herePlusOnes, hereBringingKit);
      return;
    }
    if (rsvpd) {
      onCancel(game.id);
      return;
    }
    onRequestRsvp(game, plusOnes, bringingKit);
  };

  return (
    <div
      className={className}
      {...(walkthroughAnchorActive ? { "data-walkthrough-target": "walk-ins" } : {})}
    >
      {!committed && (
        <CommitExtras
          plusOnes={isLive ? herePlusOnes : plusOnes}
          onPlusOnesChange={isLive ? onHerePlusOnesChange : onPlusOnesChange}
          bringingKit={isLive ? hereBringingKit : bringingKit}
          onBringingKitChange={isLive ? onHereBringingKitChange : onBringingKitChange}
          guestsLabel={isLive ? "With you" : "Guests"}
          kitLabel={isLive ? "Has kit" : "Bringing kit"}
          disabled={saving}
        />
      )}
      {showWalkInInput && (
        <WalkInAddForm
          disabled={walkInDisabled}
          placeholder={walkInPlaceholder}
          onAdd={onAddWalkIn}
        />
      )}
      <Button
        variant={ctaVariant}
        block
        className={`game-detail-panel__cta${ctaSavingClass}`}
        onClick={handleClick}
        disabled={ctaDisabled}
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
