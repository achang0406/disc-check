import Button from "../ui/Button.jsx";
import PlusOnesInput from "./PlusOnesInput.jsx";

export default function GameDetailActions({
  game,
  isLive,
  rsvpd,
  checkedIn,
  saving,
  plusOnes,
  onPlusOnesChange,
  herePlusOnes,
  onHerePlusOnesChange,
  onRequestRsvp,
  onCancel,
  onRequestCheckIn,
  onCheckOut,
}) {
  const cancelled = game.status === "cancelled";
  const committed = isLive ? checkedIn : rsvpd;

  const ctaLabel = cancelled
    ? "Cancelled"
    : isLive
      ? saving
        ? "..."
        : checkedIn
          ? "Leave"
          : "I'm here"
      : saving
        ? "..."
        : rsvpd
          ? "Bail"
          : "Count me in";

  const ctaVariant = committed && !cancelled ? "secondary" : "primary";
  const ctaDisabled = cancelled || saving;
  const ctaSavingClass =
    saving && !committed ? " game-detail-panel__cta--saving" : "";

  const handleClick = () => {
    if (cancelled || saving) return;
    if (isLive) {
      if (checkedIn) {
        onCheckOut(game.id);
        return;
      }
      onRequestCheckIn(game, herePlusOnes);
      return;
    }
    if (rsvpd) {
      onCancel(game.id);
      return;
    }
    onRequestRsvp(game, plusOnes);
  };

  if (cancelled) return null;

  return (
    <div className="game-detail-panel__actions">
      {!committed && (
        <PlusOnesInput
          value={isLive ? herePlusOnes : plusOnes}
          onChange={isLive ? onHerePlusOnesChange : onPlusOnesChange}
          label={isLive ? "with you" : "guests"}
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
    </div>
  );
}
