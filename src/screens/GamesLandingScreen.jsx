import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader.jsx";
import GameListItem from "../components/games/GameListItem.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { useGameClock } from "../hooks/useGameClock.js";
import { isGameEnded, isGameLive, sortGamesForLanding } from "../utils/gameSchedule.js";
import { countHeadcount, countPlayers } from "../utils/format.js";

export default function GamesLandingScreen({
  profile,
  games,
  rsvps,
  checkIns,
  guests,
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
  const sortedGames = useMemo(() => sortGamesForLanding(games, now), [games, now]);

  useEffect(() => {
    if (sortedGames.length === 1) {
      navigate(`/games/${sortedGames[0].id}`, { replace: true });
    }
  }, [sortedGames, navigate]);

  if (sortedGames.length === 1) {
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
        {sortedGames.length === 0 ? (
          <EmptyState
            text="No games yet"
            actionLabel={isAdmin ? "+ Add game" : undefined}
            onAction={isAdmin ? onAddGame : undefined}
          />
        ) : (
          <div className="game-list">
            {sortedGames.map((game, index) => {
              const live = isGameLive(game, now);
              const ended = isGameEnded(game, now);
              const count = live || ended
                ? countHeadcount(checkIns, guests, game.id)
                : countPlayers(rsvps, game.id);

              return (
                <div key={game.id} style={{ animation: `fadeUp ${0.2 + index * 0.04}s ease` }}>
                  <GameListItem
                    game={game}
                    count={count}
                    isLive={live}
                    isEnded={ended}
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
