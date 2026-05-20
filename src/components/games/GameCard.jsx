import { useState } from "react";
import { TIME_LABELS } from "../../constants/time.js";
import { getTimeSlot } from "../../utils/time.js";
import ProgressBar from "./ProgressBar.jsx";
import StatusBadge from "./StatusBadge.jsx";

const counterBtn = {
  width: 26,
  height: 26,
  borderRadius: 6,
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  color: "#e8e8e8",
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const actionBtn = {
  flex: 1,
  padding: "7px 10px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: "'DM Sans',sans-serif",
};

function disabledStyle(enabled) {
  return {
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.4,
  };
}

function SignupNames({ entries, profileId }) {
  if (entries.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 11, color: "#444", fontFamily: "'DM Mono',monospace" }}>
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
              fontSize: 11,
              lineHeight: 1.3,
              padding: "3px 8px",
              borderRadius: 999,
              background: isYou ? "#0d3320" : "#1a1a1a",
              border: `1px solid ${isYou ? "#22c55e" : "#2a2a2a"}`,
              color: isYou ? "#4ade80" : "#bbb",
              fontFamily: "'DM Mono',monospace",
              whiteSpace: "nowrap",
            }}
          >
            {entry.name}
            {entry.plusOnes > 0 && <span style={{ color: "#666" }}> +{entry.plusOnes}</span>}
            {isYou && <span style={{ color: "#4ade80" }}> · you</span>}
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
}) {
  const cancelled = game.status === "cancelled";
  const slot = getTimeSlot(game.time);
  const [plusOnes, setPlusOnes] = useState(myRsvp?.plusOnes ?? 0);

  const stop = (event) => event.stopPropagation();

  return (
    <div
      style={{
        background: "#111",
        border: `1px solid ${rsvpd ? "#2a4a2a" : "#1e1e1e"}`,
        borderRadius: 12,
        padding: "12px 14px",
        opacity: cancelled ? 0.45 : 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f0f0f0", lineHeight: 1.2 }}>
            {game.name}
          </h3>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 10,
              color: "#555",
              fontFamily: "'DM Mono',monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {game.location} · {game.city}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0,
            alignSelf: "center",
            fontSize: 9,
            padding: "1px 6px",
            borderRadius: 999,
            background: "#0d3320",
            border: "1px solid #22c55e",
            color: "#4ade80",
            fontFamily: "'DM Mono',monospace",
            visibility: rsvpd && !cancelled ? "visible" : "hidden",
          }}
        >
          IN
        </span>
        <StatusBadge count={count} target={game.target} cancelled={cancelled} />
      </div>

      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#666", fontFamily: "'DM Mono',monospace", lineHeight: 1.4 }}>
        {game.time} · {TIME_LABELS[slot]} · {game.type === "big" ? "🔴 big" : "🟡 small"}
      </p>

      {!cancelled && <ProgressBar count={count} target={game.target} compact />}

      <div style={{ marginTop: 8, flex: 1 }}>
        <p style={{ margin: "0 0 6px", fontSize: 10, color: "#555", fontFamily: "'DM Mono',monospace" }}>
          signed up ({entries.length})
        </p>
        <SignupNames entries={entries} profileId={profile?.id} />
      </div>

      {!cancelled && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1a1a1a" }} onClick={stop}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setPlusOnes(Math.max(0, plusOnes - 1))}
              disabled={rsvpd}
              style={{
                ...counterBtn,
                ...disabledStyle(!rsvpd),
              }}
            >
              −
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: "center", fontFamily: "'DM Mono',monospace" }}>
              {plusOnes}
            </span>
            <button
              type="button"
              onClick={() => setPlusOnes(plusOnes + 1)}
              disabled={rsvpd}
              style={{
                ...counterBtn,
                ...disabledStyle(!rsvpd),
              }}
            >
              +
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => onRequestRsvp(game, plusOnes)}
              disabled={rsvpd || saving}
              style={{
                ...actionBtn,
                ...disabledStyle(!rsvpd && !saving),
                background: saving && !rsvpd ? "#0d3320" : "#166534",
                border: "1px solid #22c55e",
                color: "#4ade80",
              }}
            >
              {saving && !rsvpd ? "..." : "Count me in"}
            </button>
            <button
              type="button"
              onClick={() => onCancel(game.id)}
              disabled={!rsvpd || saving}
              style={{
                ...actionBtn,
                ...disabledStyle(rsvpd && !saving),
                background: "#1a0707",
                border: "1px solid #7f1d1d",
                color: "#f87171",
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {saving && rsvpd ? "..." : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
