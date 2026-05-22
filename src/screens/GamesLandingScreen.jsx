import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader.jsx";
import GameListItem from "../components/games/GameListItem.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { useGameClock } from "../hooks/useGameClock.js";
import { isGameLive } from "../utils/gameSchedule.js";
import { countPlayers } from "../utils/format.js";

export default function GamesLandingScreen({
  profile,
  games,
  rsvps,
  checkIns,
  isRsvpd,
  isCheckedIn,
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
  const navigate = useNavigate();
  const now = useGameClock();

  useEffect(() => {
    if (games.length === 1) {
      navigate(`/games/${games[0].id}`, { replace: true });
    }
  }, [games, navigate]);

  if (games.length === 1) {
    return null;
  }

  return (
    <div className="games-screen">
      <AppHeader
        profile={profile}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onProfileClick={onProfileClick}
        adminAvailable={adminAvailable}
        isAdmin={isAdmin}
        onAdminLoginClick={onAdminLoginClick}
        onAdminLogout={onAdminLogout}
        onAddGame={onAddGame}
        showAdmin
      />

      <main className="games-screen__main games-screen__main--landing">
        {games.length === 0 ? (
          <EmptyState
            text="no games yet"
            actionLabel={isAdmin ? "+ Add game" : undefined}
            onAction={isAdmin ? onAddGame : undefined}
          />
        ) : (
          <div className="game-list">
            {games.map((game, index) => {
              const live = isGameLive(game.startsAt, now);
              const count = live ? countPlayers(checkIns, game.id) : countPlayers(rsvps, game.id);

              return (
                <div key={game.id} style={{ animation: `fadeUp ${0.2 + index * 0.04}s ease` }}>
                  <GameListItem
                    game={game}
                    count={count}
                    isLive={live}
                    rsvpd={isRsvpd(game.id)}
                    checkedIn={isCheckedIn(game.id)}
                    isAdmin={isAdmin}
                    onEditGame={onEditGame}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
