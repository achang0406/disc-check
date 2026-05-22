import { useEffect, useState } from "react";
import { TIME_LABELS, formatGameTime, getTimeSlot } from "../../utils/time.js";
import { formatGameType } from "../../utils/gameType.js";
import { formatGameLocation } from "../../utils/location.js";
import LocationDisplay from "./LocationDisplay.jsx";
import ProgressBar from "./ProgressBar.jsx";
import StatusBadge from "./StatusBadge.jsx";

function disabledStyle(enabled) {
  return {
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.4,
  };
}

function NameChips({ entries, profileId, emptyLabel, youLabel = "you" }) {
  if (entries.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--text-faint)", fontFamily: "'DM Mono',monospace" }}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {entries.map((entry) => {
        const isYou = entry.userId === profileId;
        return (
          <span
            key={entry.userId}
            title={
              entry.plusOnes > 0
                ? `${entry.name} + ${entry.plusOnes} guest${entry.plusOnes !== 1 ? "s" : ""}`
                : entry.name
            }
            style={{
              fontSize: "inherit",
              lineHeight: 1.3,
              padding: "4px 10px",
              borderRadius: 999,
              background: isYou ? "var(--chip-you-bg)" : "var(--chip-bg)",
              border: `1px solid ${isYou ? "var(--chip-you-border)" : "var(--chip-border)"}`,
              color: isYou ? "var(--chip-you-text)" : "var(--chip-text)",
              fontFamily: "'DM Mono',monospace",
              whiteSpace: "nowrap",
            }}
          >
            {entry.name}
            {entry.plusOnes > 0 && <span style={{ color: "var(--text-subtle)" }}> +{entry.plusOnes}</span>}
            {isYou && <span style={{ color: "var(--chip-you-text)" }}> · {youLabel}</span>}
          </span>
        );
      })}
    </div>
  );
}

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
  isAdmin,
  onEditGame,
}) {
  const cancelled = game.status === "cancelled";
  const slot = getTimeSlot(game.startsAt);
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
    isLive ? "game-card--live" : "",
    !isLive && rsvpd && !cancelled ? "game-card--rsvpd" : "",
    isLive && checkedIn && !cancelled ? "game-card--here" : "",
    cancelled ? "game-card--cancelled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="game-card__title-row">
            <h3 className="game-card__title">{game.name}</h3>
            {isAdmin && (
              <button
                type="button"
                className="game-card__edit-btn"
                onClick={() => onEditGame(game)}
                aria-label={`Edit ${game.name}`}
              >
                Edit
              </button>
            )}
          </div>
          <p className="game-card__meta">
            <LocationDisplay display={locationDisplay} tooltip={locationTooltip} />
            {city ? <> · {city}</> : null}
          </p>
        </div>
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

      <p className="game-card__detail">
        {formatGameTime(game.startsAt)} · {TIME_LABELS[slot]} · {formatGameType(game.type)}
      </p>

      {!cancelled && (
        <div className="game-card__phase-stack">
          <section className={`game-card__phase game-card__phase--rsvp${isLive ? " game-card__phase--exit" : ""}`}>
            <ProgressBar count={rsvpCount} target={game.target} label="RSVP" />
            <div className="game-card__section">
              <p className="game-card__section-label">Signed up</p>
              <NameChips entries={rsvpEntries} profileId={profile?.id} emptyLabel="no signups yet" />
            </div>
            <div className="game-card__divider" onClick={stop}>
              <div className="game-card__actions">
                <button
                  type="button"
                  className={`game-card__action game-card__action--rsvp${saving && !rsvpd ? " game-card__action--saving" : ""}`}
                  onClick={() => onRequestRsvp(game, plusOnes)}
                  disabled={rsvpd || saving}
                  style={disabledStyle(!rsvpd && !saving)}
                >
                  {saving && !rsvpd ? "..." : "Count me in"}
                </button>
                <div className="game-card__plus-ones" aria-label="Plus ones">
                  <button
                    type="button"
                    className="game-card__plus-btn"
                    onClick={() => setPlusOnes(Math.max(0, plusOnes - 1))}
                    disabled={rsvpd}
                    style={disabledStyle(!rsvpd)}
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
                    style={disabledStyle(!rsvpd)}
                    aria-label="Add plus one"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="game-card__action game-card__action--cancel"
                  onClick={() => onCancel(game.id)}
                  disabled={!rsvpd || saving}
                  style={disabledStyle(rsvpd && !saving)}
                >
                  {saving && rsvpd ? "..." : "Cancel"}
                </button>
              </div>
            </div>
          </section>

          <section className={`game-card__phase game-card__phase--live${isLive ? " game-card__phase--active" : ""}`}>
            <div className="game-card__locked-rsvp">
              <p className="game-card__section-label game-card__section-label--locked">
                <span aria-hidden="true">🔒</span> RSVP locked · {rsvpCount} signed up
              </p>
              <NameChips entries={rsvpEntries} profileId={profile?.id} emptyLabel="no one signed up" youLabel="signed up" />
            </div>

            <ProgressBar count={checkInCount} target={game.target} label="Here now" />
            <div className="game-card__section">
              <p className="game-card__section-label">Who&apos;s here</p>
              <NameChips entries={checkInEntries} profileId={profile?.id} emptyLabel="no one checked in yet" youLabel="here" />
            </div>

            <div className="game-card__divider" onClick={stop}>
              <div className="game-card__actions">
                <button
                  type="button"
                  className={`game-card__action game-card__action--rsvp${saving && !checkedIn ? " game-card__action--saving" : ""}`}
                  onClick={() => onRequestCheckIn(game, herePlusOnes)}
                  disabled={checkedIn || saving}
                  style={disabledStyle(!checkedIn && !saving)}
                >
                  {saving && !checkedIn ? "..." : "I'm here"}
                </button>
                <div className="game-card__plus-ones" aria-label="Guests here">
                  <button
                    type="button"
                    className="game-card__plus-btn"
                    onClick={() => setHerePlusOnes(Math.max(0, herePlusOnes - 1))}
                    disabled={checkedIn}
                    style={disabledStyle(!checkedIn)}
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
                    style={disabledStyle(!checkedIn)}
                    aria-label="Add guest"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="game-card__action game-card__action--cancel"
                  onClick={() => onCheckOut(game.id)}
                  disabled={!checkedIn || saving}
                  style={disabledStyle(checkedIn && !saving)}
                >
                  {saving && checkedIn ? "..." : "Leave"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
