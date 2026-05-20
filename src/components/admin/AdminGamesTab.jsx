import GameForm from "../games/GameForm.jsx";
import { TIME_LABELS } from "../../constants/time.js";
import { card, smallButton } from "../../styles/theme.js";
import { countPlayers } from "../../utils/format.js";
import { formatGameType } from "../../utils/gameType.js";
import { getTimeSlot } from "../../utils/time.js";

export default function AdminGamesTab({
  gamesMeta,
  rsvps,
  editingGame,
  onStartCreate,
  onStartEdit,
  onCancelEdit,
  onCreateGame,
  onEditGame,
  onToggleStatus,
  onDeleteGame,
}) {
  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#555", fontFamily: "'DM Mono',monospace" }}>
          {gamesMeta.length} games
        </p>
        <button
          onClick={onStartCreate}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: "#0d4f2e",
            border: "1px solid #22c55e",
            color: "#4ade80",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'DM Mono',monospace",
            fontWeight: 600,
          }}
        >
          + new game
        </button>
      </div>

      {editingGame === "new" && (
        <div style={{ ...card, marginBottom: 16, border: "1px solid #22c55e" }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#4ade80", fontFamily: "'DM Mono',monospace" }}>
            create new game
          </p>
          <GameForm onSave={onCreateGame} onCancel={onCancelEdit} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {gamesMeta.map((game) => {
          const count = countPlayers(rsvps, game.id);
          const cancelled = game.status === "cancelled";
          const isEditing = editingGame && editingGame.id === game.id;

          return (
            <div
              key={game.id}
              style={{
                ...card,
                opacity: cancelled ? 0.6 : 1,
                border: isEditing ? "1px solid #f59e0b" : "1px solid #1e1e1e",
              }}
            >
              {isEditing ? (
                <>
                  <p style={{ margin: "0 0 14px", fontSize: 13, color: "#fbbf24", fontFamily: "'DM Mono',monospace" }}>
                    editing: {game.name}
                  </p>
                  <GameForm initial={game} onSave={onEditGame} onCancel={onCancelEdit} />
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0" }}>{game.name}</span>
                      {cancelled && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "#1a1a1a",
                            color: "#555",
                            fontFamily: "'DM Mono',monospace",
                          }}
                        >
                          cancelled
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "#555", fontFamily: "'DM Mono',monospace" }}>
                      {game.location} · {game.city}
                    </p>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#666", fontFamily: "'DM Mono',monospace" }}>📅 {game.time}</span>
                      <span style={{ fontSize: 12, color: "#666", fontFamily: "'DM Mono',monospace" }}>
                        {TIME_LABELS[getTimeSlot(game.time)]}
                      </span>
                      <span style={{ fontSize: 12, color: "#666", fontFamily: "'DM Mono',monospace" }}>
                        {formatGameType(game.type)} · {game.target}+
                      </span>
                      <span style={{ fontSize: 12, color: "#666", fontFamily: "'DM Mono',monospace" }}>
                        👥 {count} signed up
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginLeft: 12, flexShrink: 0 }}>
                    <button onClick={() => onStartEdit(game)} style={smallButton("#1a1a00", "#2a2a00", "#fbbf24")}>
                      ✏
                    </button>
                    <button
                      onClick={() => onToggleStatus(game.id)}
                      style={smallButton(
                        cancelled ? "#071a0f" : "#1a0707",
                        cancelled ? "#166534" : "#7f1d1d",
                        cancelled ? "#4ade80" : "#f87171",
                      )}
                    >
                      {cancelled ? "↺" : "✕"}
                    </button>
                    <button onClick={() => onDeleteGame(game.id)} style={smallButton("#1a0707", "#7f1d1d", "#f87171")}>
                      🗑
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
