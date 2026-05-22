import { useEffect, useState } from "react";
import Button from "../ui/Button.jsx";
import ChipList from "../ui/ChipList.jsx";
import MetaRow from "../ui/MetaRow.jsx";
import ProgressBar from "./ProgressBar.jsx";
import StatusBadge from "./StatusBadge.jsx";
import LocationDisplay from "./LocationDisplay.jsx";
import { formatGameLocation } from "../../utils/location.js";

export default function GameCard({
  profile,
  game,
  isLive,
  rsvpCount,
  rsvpEntries,
  checkInCount,
  checkInEntries,
  rsvpd,
  checkedIn,
  myRsvp,
  myCheckIn,
  saving,
  onRequestRsvp,
  onCancel,
  onRequestCheckIn,
  onCheckOut,
  className = "",
}) {
  const cancelled = game.status === "cancelled";
  const { display: locationDisplay, tooltip: locationTooltip, city } = formatGameLocation(game);
  const [plusOnes, setPlusOnes] = useState(myRsvp?.plusOnes ?? 0);
  const [herePlusOnes, setHerePlusOnes] = useState(myCheckIn?.plusOnes ?? 0);

  useEffect(() => {
    if (!isLive) {
      setPlusOnes(myRsvp?.plusOnes ?? 0);
    }
  }, [isLive, myRsvp?.plusOnes]);

  useEffect(() => {
    if (isLive) {
      setHerePlusOnes(myCheckIn?.plusOnes ?? 0);
    }
  }, [isLive, myCheckIn?.plusOnes]);

  const stop = (event) => event.stopPropagation();
  const activeCount = isLive ? checkInCount : rsvpCount;
  const cardClass = [
    "game-card",
    "surface",
    "game-card--detail",
    isLive ? "game-card--live" : "",
    !isLive && rsvpd && !cancelled ? "game-card--rsvpd" : "",
    isLive && checkedIn && !cancelled ? "game-card--here" : "",
    cancelled ? "game-card--cancelled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div className="game-card__header">
        <div className="game-card__header-main">
          <h3 className="game-card__title">{game.name}</h3>
          <p className="meta-row meta-row--location game-card__meta">
            <LocationDisplay display={locationDisplay} tooltip={locationTooltip} />
            {city ? <span className="meta-row__city game-card__meta-city"> · {city}</span> : null}
          </p>
        </div>
        <div className="game-card__header-badges">
          <span
            className="game-card__status-pill"
            style={{
              visibility: !cancelled && ((isLive && checkedIn) || (!isLive && rsvpd)) ? "visible" : "hidden",
            }}
          >
            {isLive ? "HERE" : "IN"}
          </span>
          <StatusBadge count={activeCount} target={game.target} cancelled={cancelled} />
        </div>
      </div>

      <MetaRow game={game} scheduleClassName="game-card__detail" />

      {!cancelled && (
        <div className="game-card__phase-stack">
          <section className={`game-card__phase game-card__phase--rsvp${isLive ? " game-card__phase--exit" : ""}`}>
            <ProgressBar count={rsvpCount} target={game.target} label="RSVP" />
            <div className="game-card__section">
              <p className="game-card__section-label">Signed up</p>
              <ChipList entries={rsvpEntries} profileId={profile?.id} emptyLabel="no signups yet" />
            </div>
            <div className="game-card__divider" onClick={stop}>
              <div className="game-card__actions">
                <Button
                  variant="primary"
                  block
                  className={`game-card__action game-card__action--rsvp${saving && !rsvpd ? " game-card__action--saving" : ""}`}
                  onClick={() => onRequestRsvp(game, plusOnes)}
                  disabled={rsvpd || saving}
                >
                  {saving && !rsvpd ? "..." : "Count me in"}
                </Button>
                <div className="game-card__plus-ones" aria-label="Plus ones">
                  <button
                    type="button"
                    className="game-card__plus-btn"
                    onClick={() => setPlusOnes(Math.max(0, plusOnes - 1))}
                    disabled={rsvpd}
                    aria-label="Remove plus one"
                  >
                    −
                  </button>
                  <span className="game-card__plus-value">{plusOnes}</span>
                  <button
                    type="button"
                    className="game-card__plus-btn"
                    onClick={() => setPlusOnes(plusOnes + 1)}
                    disabled={rsvpd}
                    aria-label="Add plus one"
                  >
                    +
                  </button>
                </div>
                <Button
                  variant="secondary"
                  block
                  className="game-card__action game-card__action--cancel"
                  onClick={() => onCancel(game.id)}
                  disabled={!rsvpd || saving}
                >
                  {saving && rsvpd ? "..." : "Cancel"}
                </Button>
              </div>
            </div>
          </section>

          <section className={`game-card__phase game-card__phase--live${isLive ? " game-card__phase--active" : ""}`}>
            <div className="game-card__locked-rsvp">
              <p className="game-card__section-label game-card__section-label--locked">
                <span aria-hidden="true">🔒</span> RSVP locked · {rsvpCount} signed up
              </p>
              <ChipList
                entries={rsvpEntries}
                profileId={profile?.id}
                emptyLabel="no one signed up"
                youLabel="signed up"
                className="game-card__chips--compact-hide"
              />
            </div>

            <ProgressBar count={checkInCount} target={game.target} label="Here now" />
            <div className="game-card__section">
              <p className="game-card__section-label">Who&apos;s here</p>
              <ChipList
                entries={checkInEntries}
                profileId={profile?.id}
                emptyLabel="no one checked in yet"
                youLabel="here"
              />
            </div>

            <div className="game-card__divider" onClick={stop}>
              <div className="game-card__actions">
                <Button
                  variant="primary"
                  block
                  className={`game-card__action game-card__action--rsvp${saving && !checkedIn ? " game-card__action--saving" : ""}`}
                  onClick={() => onRequestCheckIn(game, herePlusOnes)}
                  disabled={checkedIn || saving}
                >
                  {saving && !checkedIn ? "..." : "I'm here"}
                </Button>
                <div className="game-card__plus-ones" aria-label="Guests here">
                  <button
                    type="button"
                    className="game-card__plus-btn"
                    onClick={() => setHerePlusOnes(Math.max(0, herePlusOnes - 1))}
                    disabled={checkedIn}
                    aria-label="Remove guest"
                  >
                    −
                  </button>
                  <span className="game-card__plus-value">{herePlusOnes}</span>
                  <button
                    type="button"
                    className="game-card__plus-btn"
                    onClick={() => setHerePlusOnes(herePlusOnes + 1)}
                    disabled={checkedIn}
                    aria-label="Add guest"
                  >
                    +
                  </button>
                </div>
                <Button
                  variant="secondary"
                  block
                  className="game-card__action game-card__action--cancel"
                  onClick={() => onCheckOut(game.id)}
                  disabled={!checkedIn || saving}
                >
                  {saving && checkedIn ? "..." : "Leave"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
