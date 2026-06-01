import Button from "../ui/Button.jsx";
import CommitExtras from "./CommitExtras.jsx";

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
    <div className="game-detail-panel__actions">
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
      <Button
        variant={ctaVariant}
        block
        className={`game-detail-panel__cta${ctaSavingClass}`}
        onClick={handleClick}
        disabled={ctaDisabled}
      >
        {ctaLabel}
      </Button>
      {isLive && !checkedIn && !saving ? (
        <p className="game-detail-panel__cta-subline">Let others know you&apos;ve arrived</p>
      ) : null}
    </div>
  );
}
