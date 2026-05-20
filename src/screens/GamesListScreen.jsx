import GameCard from "../components/games/GameCard.jsx";
import { countPlayers, getInitials } from "../utils/format.js";

const gameGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 340px))",
  gap: 12,
  justifyContent: "center",
  width: "100%",
  maxWidth: 1400,
};

export default function GamesListScreen({
  profile,
  games,
  rsvps,
  myRsvps,
  savingGameId,
  isRsvpd,
  onRequestRsvp,
  onCancel,
  onProfileClick,
}) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 16px 0",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🥏</span>
          <span style={{ fontSize: 17, fontWeight: 700 }}>DiscCheck</span>
        </div>
        {profile && (
          <button
            type="button"
            onClick={onProfileClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "inherit",
            }}
          >
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
              {getInitials(profile.name)}
            </div>
            <span style={{ fontSize: 12, color: "#555", fontFamily: "'DM Mono',monospace" }}>{profile.name}</span>
          </button>
        )}
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          overflow: "auto",
          padding: 16,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {games.length === 0 ? (
          <div style={{ textAlign: "center", margin: "auto" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🌬️</p>
            <p style={{ color: "#555", fontFamily: "'DM Mono',monospace", fontSize: 13 }}>no games yet</p>
          </div>
        ) : (
          <div style={{ ...gameGrid, margin: "auto" }}>
            {games.map((game, index) => (
              <div key={game.id} style={{ animation: `fadeUp ${0.2 + index * 0.04}s ease`, minWidth: 0 }}>
                <GameCard
                  profile={profile}
                  game={game}
                  count={countPlayers(rsvps, game.id)}
                  entries={rsvps[game.id] || []}
                  rsvpd={isRsvpd(game.id)}
                  myRsvp={myRsvps[game.id]}
                  saving={savingGameId === game.id}
                  onRequestRsvp={onRequestRsvp}
                  onCancel={onCancel}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
