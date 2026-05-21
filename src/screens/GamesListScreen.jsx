import GameCard from "../components/games/GameCard.jsx";
import { countPlayers, getInitials } from "../utils/format.js";

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
  theme,
  onToggleTheme,
  adminAvailable,
  isAdmin,
  onAdminLoginClick,
  onAdminLogout,
  onAddGame,
  onEditGame,
}) {
  return (
    <div
      className="games-screen"
      style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        color: "var(--text)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 16px 0",
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 22 }}>🥏</span>
          <span style={{ fontSize: 17, fontWeight: 700 }}>DiscCheck</span>
          {isAdmin && (
            <>
              <span className="games-screen__admin-badge">ADMIN</span>
              <button type="button" className="games-screen__admin-link" onClick={onAdminLogout}>
                Sign out
              </button>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {adminAvailable && !isAdmin && (
            <button
              type="button"
              className="theme-toggle"
              onClick={onAdminLoginClick}
              aria-label="Admin login"
              title="Admin login"
            >
              🔒
            </button>
          )}
          {isAdmin && (
            <button type="button" className="games-screen__add-game games-screen__add-game--header" onClick={onAddGame}>
              + Add game
            </button>
          )}
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
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
                  background: "var(--profile-bg)",
                  border: "1px solid var(--profile-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--profile-text)",
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                {getInitials(profile.name)}
              </div>
              <span style={{ fontSize: 12, color: "var(--header-muted)", fontFamily: "'DM Mono',monospace" }}>
                {profile.name}
              </span>
            </button>
          )}
        </div>
      </header>

      <main className="games-screen__main">
        {games.length === 0 ? (
          <div style={{ textAlign: "center", margin: "auto" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🌬️</p>
            <p style={{ color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontSize: 13 }}>no games yet</p>
            {isAdmin && (
              <button type="button" className="games-screen__add-game" onClick={onAddGame} style={{ marginTop: 12 }}>
                + Add game
              </button>
            )}
          </div>
        ) : (
          <div className="game-grid">
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
                  isAdmin={isAdmin}
                  onEditGame={onEditGame}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
