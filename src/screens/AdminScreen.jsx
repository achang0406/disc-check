import AdminDashboard from "../components/admin/AdminDashboard.jsx";
import AdminGamesTab from "../components/admin/AdminGamesTab.jsx";
import AdminPlayersTab from "../components/admin/AdminPlayersTab.jsx";

const TABS = [
  { id: "dashboard", label: "📊 dashboard" },
  { id: "games", label: "🗓 games" },
  { id: "players", label: "👥 players" },
];

export default function AdminScreen({
  gamesMeta,
  rsvps,
  adminTab,
  editingGame,
  adminSelectedGame,
  onLogout,
  onTabChange,
  onEditGameFromDashboard,
  onToggleStatus,
  onViewPlayers,
  onStartCreate,
  onStartEdit,
  onCancelEdit,
  onCreateGame,
  onEditGame,
  onDeleteGame,
  onSelectGameFilter,
  onClearGameFilter,
  onRemovePlayer,
}) {
  const tabButtonStyle = (id) => ({
    padding: "7px 16px",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'DM Mono',monospace",
    fontWeight: adminTab === id ? 600 : 400,
    background: adminTab === id ? "#1a2e1a" : "transparent",
    border: adminTab === id ? "1px solid #22c55e" : "1px solid transparent",
    color: adminTab === id ? "#4ade80" : "#555",
    transition: "all 0.15s",
  });

  return (
    <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🥏</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>DiscCheck</span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 999,
              background: "#1a1a00",
              border: "1px solid #f59e0b",
              color: "#fbbf24",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            ADMIN
          </span>
        </div>
        <button
          onClick={onLogout}
          style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace" }}
        >
          sign out
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 24,
          background: "#0d0d0d",
          padding: 4,
          borderRadius: 10,
          border: "1px solid #1a1a1a",
        }}
      >
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => onTabChange(id)} style={tabButtonStyle(id)}>
            {label}
          </button>
        ))}
      </div>

      {adminTab === "dashboard" && (
        <AdminDashboard
          gamesMeta={gamesMeta}
          rsvps={rsvps}
          onEditGame={onEditGameFromDashboard}
          onToggleStatus={onToggleStatus}
          onViewPlayers={onViewPlayers}
        />
      )}

      {adminTab === "games" && (
        <AdminGamesTab
          gamesMeta={gamesMeta}
          rsvps={rsvps}
          editingGame={editingGame}
          onStartCreate={onStartCreate}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onCreateGame={onCreateGame}
          onEditGame={onEditGame}
          onToggleStatus={onToggleStatus}
          onDeleteGame={onDeleteGame}
        />
      )}

      {adminTab === "players" && (
        <AdminPlayersTab
          gamesMeta={gamesMeta}
          rsvps={rsvps}
          adminSelectedGame={adminSelectedGame}
          onSelectGame={onSelectGameFilter}
          onClearGameFilter={onClearGameFilter}
          onRemovePlayer={onRemovePlayer}
        />
      )}
    </div>
  );
}
