import { useMemo } from "react";
import AppHeader from "../components/layout/AppHeader.jsx";
import GameListItem from "../components/games/GameListItem.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { Link } from "react-router-dom";
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
  const now = useGameClock();
  const sortedGames = useMemo(() => sortGamesForLanding(games, now), [games, now]);
  const singleGame = sortedGames.length === 1 ? sortedGames[0] : null;

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
        showInstallLink
      />

      <main className="games-screen__main games-screen__main--landing">
        {sortedGames.length > 0 && (
          <div className="landing-intro surface">
            <p className="landing-intro__text">
              DiscCheck helps your pickup group decide if this week&apos;s game is on — sign up,
              watch the count, and chat when you arrive. All skill levels welcome.
            </p>
            {singleGame ? (
              <Link to={`/games/${singleGame.id}`} className="landing-intro__link">
                Go to {singleGame.name} →
              </Link>
            ) : null}
          </div>
        )}

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
