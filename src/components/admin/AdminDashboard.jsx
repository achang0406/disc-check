import ProgressBar from "../games/ProgressBar.jsx";
import StatusBadge from "../games/StatusBadge.jsx";
import { formatGameTime } from "../../utils/time.js";
import { card, smallButton } from "../../styles/theme.js";
import { countPlayers } from "../../utils/format.js";

export default function AdminDashboard({
  gamesMeta,
  rsvps,
  onEditGame,
  onToggleStatus,
  onViewPlayers,
}) {
  const stats = [
    ["Total games", gamesMeta.length, "#4ade80"],
    ["Active", gamesMeta.filter((game) => game.status !== "cancelled").length, "#4ade80"],
    [
      "Game on",
      gamesMeta.filter((game) => game.status !== "cancelled" && countPlayers(rsvps, game.id) >= game.target).length,
      "#22c55e",
    ],
    [
      "Total RSVPs",
      Object.values(rsvps).reduce(
        (sum, entries) => sum + entries.reduce((acc, entry) => acc + 1 + (entry.plusOnes || 0), 0),
        0,
      ),
      "#fbbf24",
    ],
  ];

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {stats.map(([label, value, color]) => (
          <div
            key={label}
            style={{
              background: "#0d0d0d",
              border: "1px solid #1a1a1a",
              borderRadius: 10,
              padding: "12px 14px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color, fontFamily: "'DM Mono',monospace" }}>
              {value}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#555", fontFamily: "'DM Mono',monospace" }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={card}>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#555", fontFamily: "'DM Mono',monospace" }}>
          all games at a glance
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {gamesMeta.map((game) => {
            const count = countPlayers(rsvps, game.id);
            const cancelled = game.status === "cancelled";

            return (
              <div
                key={game.id}
                style={{
                  background: "#0d0d0d",
                  borderRadius: 10,
                  padding: "12px 14px",
                  border: "1px solid #1e1e1e",
                  opacity: cancelled ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#e8e8e8" }}>{game.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#555", fontFamily: "'DM Mono',monospace" }}>
                      {formatGameTime(game.startsAt)} · {game.city}
                    </span>
                  </div>
                  <StatusBadge count={count} target={game.target} cancelled={cancelled} />
                </div>
                <ProgressBar count={count} target={game.target} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => onEditGame(game)}
                    style={smallButton("#1a1a1a", "#2a2a2a", "#888")}
                  >
                    ✏ edit
                  </button>
                  <button
                    onClick={() => onToggleStatus(game.id)}
                    style={smallButton(
                      cancelled ? "#071a0f" : "#1a0707",
                      cancelled ? "#166534" : "#7f1d1d",
                      cancelled ? "#4ade80" : "#f87171",
                    )}
                  >
                    {cancelled ? "↺ reopen" : "✕ cancel"}
                  </button>
                  <button
                    onClick={() => onViewPlayers(game)}
                    style={smallButton("#0d1a2e", "#1e3a5f", "#60a5fa")}
                  >
                    👥 players ({(rsvps[game.id] || []).length})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
