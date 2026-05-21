import { Fragment } from "react";
import ProgressBar from "../games/ProgressBar.jsx";
import StatusBadge from "../games/StatusBadge.jsx";
import { card, smallButton } from "../../styles/theme.js";
import { countPlayers, getInitials } from "../../utils/format.js";
import { formatGameTime } from "../../utils/time.js";

export default function AdminPlayersTab({
  gamesMeta,
  rsvps,
  adminSelectedGame,
  onSelectGame,
  onClearGameFilter,
  onRemovePlayer,
}) {
  const gamesToShow = adminSelectedGame ? [adminSelectedGame] : gamesMeta;

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={onClearGameFilter}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'DM Mono',monospace",
            background: !adminSelectedGame ? "#1a2e1a" : "#111",
            border: !adminSelectedGame ? "1px solid #22c55e" : "1px solid #2a2a2a",
            color: !adminSelectedGame ? "#4ade80" : "#555",
          }}
        >
          all games
        </button>
        {gamesMeta.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'DM Mono',monospace",
              background: adminSelectedGame?.id === game.id ? "#1a2e1a" : "#111",
              border: adminSelectedGame?.id === game.id ? "1px solid #22c55e" : "1px solid #2a2a2a",
              color: adminSelectedGame?.id === game.id ? "#4ade80" : "#555",
            }}
          >
            {game.name}
          </button>
        ))}
      </div>

      {gamesToShow.map((game) => {
        const entries = rsvps[game.id] || [];
        const count = countPlayers(rsvps, game.id);
        const cancelled = game.status === "cancelled";

        return (
          <div key={game.id} style={{ ...card, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0" }}>{game.name}</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: "#555", fontFamily: "'DM Mono',monospace" }}>
                  {formatGameTime(game.startsAt)} · {game.city}
                </span>
              </div>
              <StatusBadge count={count} target={game.target} cancelled={cancelled} />
            </div>
            <ProgressBar count={count} target={game.target} />

            {entries.length === 0 ? (
              <p style={{ marginTop: 12, fontSize: 13, color: "#444", fontFamily: "'DM Mono',monospace" }}>
                no players yet
              </p>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    gap: "8px 12px",
                    alignItems: "center",
                  }}
                >
                  {["", "player", "+1s", ""].map((header, index) => (
                    <span
                      key={header || `header-${index}`}
                      style={{
                        fontSize: 10,
                        color: "#333",
                        fontFamily: "'DM Mono',monospace",
                        paddingBottom: 4,
                      }}
                    >
                      {header}
                    </span>
                  ))}
                  {entries.map((entry) => (
                    <Fragment key={entry.userId}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "#1a2e1a",
                          border: "1px solid #2a4a2a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#4ade80",
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        {getInitials(entry.name)}
                      </div>
                      <span style={{ fontSize: 13, color: "#ccc" }}>{entry.name}</span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#555",
                          fontFamily: "'DM Mono',monospace",
                          textAlign: "center",
                        }}
                      >
                        +{entry.plusOnes || 0}
                      </span>
                      <button
                        onClick={() => onRemovePlayer(game.id, entry.userId)}
                        style={{ ...smallButton("#1a0707", "#7f1d1d", "#f87171"), fontSize: 10, padding: "3px 8px" }}
                      >
                        remove
                      </button>
                    </Fragment>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid #1a1a1a",
                    fontSize: 11,
                    color: "#444",
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  {entries.length} RSVP{entries.length !== 1 ? "s" : ""} · {count} total players ·{" "}
                  {Math.max(0, game.target - count)} still needed
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
