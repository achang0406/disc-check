import { Navigate, useNavigate, useParams } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader.jsx";
import GameCard from "../components/games/GameCard.jsx";
import Button from "../components/ui/Button.jsx";
import { useGameClock } from "../hooks/useGameClock.js";
import { isGameLive } from "../utils/gameSchedule.js";
import { countPlayers } from "../utils/format.js";

export default function GameDetailScreen({
  profile,
  games,
  rsvps,
  checkIns,
  myRsvps,
  myCheckIns,
  savingGameId,
  isRsvpd,
  isCheckedIn,
  onRequestRsvp,
  onCancel,
  onRequestCheckIn,
  onCheckOut,
  onProfileClick,
  theme,
  onToggleTheme,
}) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const now = useGameClock();

  const game = games.find((item) => item.id === gameId);
  if (!game) {
    return <Navigate to="/" replace />;
  }

  const live = isGameLive(game.startsAt, now);
  const showBack = games.length > 1;

  return (
    <div className="games-screen games-screen--with-chat">
      <AppHeader
        profile={profile}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onProfileClick={onProfileClick}
        leading={
          showBack ? (
            <Button
              variant="icon"
              className="app-header__back"
              onClick={() => navigate("/")}
              aria-label="All games"
            >
              ←
            </Button>
          ) : null
        }
      />

      <main className="games-screen__main games-screen__main--detail">
        <div className="game-detail">
          <GameCard
            profile={profile}
            game={game}
            isLive={live}
            rsvpCount={countPlayers(rsvps, game.id)}
            rsvpEntries={rsvps[game.id] || []}
            checkInCount={countPlayers(checkIns, game.id)}
            checkInEntries={checkIns[game.id] || []}
            rsvpd={isRsvpd(game.id)}
            checkedIn={isCheckedIn(game.id)}
            myRsvp={myRsvps[game.id]}
            myCheckIn={myCheckIns[game.id]}
            saving={savingGameId === game.id}
            onRequestRsvp={onRequestRsvp}
            onCancel={onCancel}
            onRequestCheckIn={onRequestCheckIn}
            onCheckOut={onCheckOut}
          />
        </div>
      </main>
    </div>
  );
}
