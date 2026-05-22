import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import AppHeader from "../components/layout/AppHeader.jsx";
import GameCard from "../components/games/GameCard.jsx";
import GameCommitStrip from "../components/games/GameCommitStrip.jsx";
import GameDetailActions from "../components/games/GameDetailActions.jsx";
import GameDetailHeightShell from "../components/games/GameDetailHeightShell.jsx";
import GameChatThread from "../components/presence/GameChatThread.jsx";
import Button from "../components/ui/Button.jsx";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
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
  onSetRsvpBail,
  onProfileClick,
  theme,
  onToggleTheme,
  presence,
  showToast,
}) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { isWide } = useBreakpoint();
  const now = useGameClock();
  const [plusOnes, setPlusOnes] = useState(0);
  const [herePlusOnes, setHerePlusOnes] = useState(0);
  const [stripExpanded, setStripExpanded] = useState(false);
  const prevRsvpIdsRef = useRef(null);

  const game = games.find((item) => item.id === gameId);
  if (!game) {
    return <Navigate to="/" replace />;
  }

  const live = isGameLive(game, now);
  const showBack = games.length > 1;
  const rsvpCount = countPlayers(rsvps, game.id);
  const checkInCount = countPlayers(checkIns, game.id);
  const rsvpEntries = rsvps[game.id] || [];
  const checkInEntries = checkIns[game.id] || [];
  const rsvpd = isRsvpd(game.id);
  const checkedIn = isCheckedIn(game.id);
  const saving = savingGameId === game.id;
  const activeCount = live ? checkInCount : rsvpCount;

  const cardProps = {
    profile,
    game,
    isLive: live,
    rsvpCount,
    rsvpEntries,
    checkInCount,
    checkInEntries,
    rsvpd,
    checkedIn,
    onAddressCopy: () => showToast?.("Address copied"),
    onSetRsvpBail,
    saving,
  };

  useEffect(() => {
    if (!live) {
      setPlusOnes(myRsvps[game.id]?.plusOnes ?? 0);
    }
  }, [game.id, live, myRsvps]);

  useEffect(() => {
    if (live) {
      setHerePlusOnes(myCheckIns[game.id]?.plusOnes ?? 0);
    }
  }, [game.id, live, myCheckIns]);

  useEffect(() => {
    if (live || !showToast) return;

    const currentIds = new Set(rsvpEntries.map((entry) => entry.userId));

    if (prevRsvpIdsRef.current === null) {
      prevRsvpIdsRef.current = currentIds;
      return;
    }

    const newSignups = rsvpEntries.filter(
      (entry) =>
        !prevRsvpIdsRef.current.has(entry.userId) && entry.userId !== profile?.id,
    );

    for (const entry of newSignups) {
      const plusText = entry.plusOnes > 0 ? ` (+${entry.plusOnes})` : "";
      showToast(`${entry.name}${plusText} signed up`, "success");
    }

    prevRsvpIdsRef.current = currentIds;
  }, [live, profile?.id, rsvpEntries, showToast]);

  const cancelled = game.status === "cancelled";
  const panelClass = [
    "game-detail-panel",
    "surface",
    live ? "game-detail-panel--live" : "",
    !live && rsvpd && !cancelled ? "game-detail-panel--rsvpd" : "",
    live && checkedIn && !cancelled ? "game-detail-panel--here" : "",
    cancelled ? "game-detail-panel--cancelled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const actionProps = {
    game,
    isLive: live,
    rsvpd,
    checkedIn,
    saving,
    plusOnes,
    onPlusOnesChange: setPlusOnes,
    herePlusOnes,
    onHerePlusOnesChange: setHerePlusOnes,
    onRequestRsvp,
    onCancel,
    onRequestCheckIn,
    onCheckOut,
  };

  return (
    <div className="games-screen games-screen--detail">
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
        <div className="game-detail-layout game-detail-layout--responsive">
          <div className={panelClass}>
            <GameDetailHeightShell
              isWide={isWide}
              wide={
                <div className="game-detail">
                  <GameCard {...cardProps} embedded />
                </div>
              }
              compact={
                <GameCommitStrip
                  profile={profile}
                  game={game}
                  isLive={live}
                  rsvpd={rsvpd}
                  checkedIn={checkedIn}
                  count={activeCount}
                  rsvpCount={rsvpCount}
                  rsvpEntries={rsvpEntries}
                  checkInEntries={checkInEntries}
                  expanded={stripExpanded}
                  onToggleExpanded={() => setStripExpanded((value) => !value)}
                  onAddressCopy={() => showToast("Address copied")}
                  onSetRsvpBail={onSetRsvpBail}
                  saving={saving}
                />
              }
            />
            <GameDetailActions {...actionProps} />
          </div>
          <div className={`game-detail-layout__thread-wrap${isWide ? " game-detail-layout__thread-wrap--hidden" : ""}`}>
            {presence && (
              <GameChatThread messages={presence.messages} selfId={presence.self.id} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
