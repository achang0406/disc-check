import { useState } from "react";
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

function SignupNames({ entries, profileId }) {
  if (entries.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--text-faint)", fontFamily: "'DM Mono',monospace" }}>
        no signups yet
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
            title={entry.plusOnes > 0 ? `${entry.name} + ${entry.plusOnes} guest${entry.plusOnes !== 1 ? "s" : ""}` : entry.name}
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
            {isYou && <span style={{ color: "var(--chip-you-text)" }}> · you</span>}
          </span>
        );
      })}
    </div>
  );
}

export default function GameCard({
  profile,
  game,
  count,
  entries,
  rsvpd,
  myRsvp,
  saving,
  onRequestRsvp,
  onCancel,
  isAdmin,
  onEditGame,
}) {
  const cancelled = game.status === "cancelled";
  const slot = getTimeSlot(game.startsAt);
  const { display: locationDisplay, tooltip: locationTooltip, city } = formatGameLocation(game);
  const [plusOnes, setPlusOnes] = useState(myRsvp?.plusOnes ?? 0);

  const stop = (event) => event.stopPropagation();
  const cardClass = ["game-card", rsvpd && !cancelled ? "game-card--rsvpd" : "", cancelled ? "game-card--cancelled" : ""]
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
          style={{
            flexShrink: 0,
            alignSelf: "center",
            fontSize: "0.72em",
            padding: "2px 7px",
            borderRadius: 999,
            background: "var(--chip-you-bg)",
            border: "1px solid var(--chip-you-border)",
            color: "var(--chip-you-text)",
            fontFamily: "'DM Mono',monospace",
            visibility: rsvpd && !cancelled ? "visible" : "hidden",
          }}
        >
          IN
        </span>
        <StatusBadge count={count} target={game.target} cancelled={cancelled} />
      </div>

      <p className="game-card__detail">
        {formatGameTime(game.startsAt)} · {TIME_LABELS[slot]} · {formatGameType(game.type)}
      </p>

      {!cancelled && <ProgressBar count={count} target={game.target} />}

      <div style={{ marginTop: 10, flex: 1 }}>
        <SignupNames entries={entries} profileId={profile?.id} />
      </div>

      {!cancelled && (
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
      )}
    </div>
  );
}
