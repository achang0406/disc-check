import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../components/layout/AppHeader.jsx";
import GameCard from "../components/games/GameCard.jsx";
import GameCommitStrip from "../components/games/GameCommitStrip.jsx";
import GameDetailActions from "../components/games/GameDetailActions.jsx";
import GameDetailHeightShell from "../components/games/GameDetailHeightShell.jsx";
import GameChatThread from "../components/presence/GameChatThread.jsx";
import Button from "../components/ui/Button.jsx";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { useChatAlerts } from "../hooks/useChatAlerts.js";
import { useGameClock } from "../hooks/useGameClock.js";
import {
  getMsUntilStart,
  isGameEnded,
  isGameLive,
  STARTING_SOON_MS,
} from "../utils/gameSchedule.js";
import { countHeadcount, countPlayers } from "../utils/format.js";
import { getPresenceUsers } from "../utils/presenceUsers.js";

export default function GameDetailScreen({
  profile,
  games,
  rsvps,
  checkIns,
  guests,
  myRsvps,
  myCheckIns,
  savingGameId,
  isRsvpd,
  isCheckedIn,
  onRequestRsvp,
  onCancel,
  onRequestCheckIn,
  onCheckOut,
  onAddWalkIn,
  onRemoveWalkIn,
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

  const game = games.find((item) => item.id === gameId) ?? null;
  const live = game ? isGameLive(game, now) : false;
  const ended = game ? isGameEnded(game, now) : false;
  const approachingStart = game
    ? (() => {
        const remaining = getMsUntilStart(game, now);
        return remaining != null && remaining <= STARTING_SOON_MS;
      })()
    : false;
  const showPickupResults = live || ended;
  const showBack = games.length > 1;
  const rsvpCount = game ? countPlayers(rsvps, game.id) : 0;
  const checkInCount = game ? countHeadcount(checkIns, guests, game.id) : 0;
  const rsvpEntries = game ? rsvps[game.id] || [] : [];
  const checkInEntries = game ? checkIns[game.id] || [] : [];
  const walkInEntries = game ? guests[game.id] || [] : [];
  const rsvpd = game ? isRsvpd(game.id) : false;
  const checkedIn = game ? isCheckedIn(game.id) : false;
  const saving = game ? savingGameId === game.id : false;
  const activeCount = showPickupResults ? checkInCount : rsvpCount;
  const watching = useMemo(
    () =>
      getPresenceUsers({
        self: presence?.self,
        watchingPeers: presence?.watchingPeers,
        connected: presence?.connected,
      }),
    [presence],
  );

  useChatAlerts({
    gameId: gameId ?? "",
    gameName: game?.name ?? "",
    messages: presence?.messages ?? [],
    selfId: presence?.self?.id,
    enabled: Boolean(game && presence?.connected),
  });

  const cardProps = {
    profile,
    game,
    isLive: live,
    isEnded: ended,
    rsvpCount,
    rsvpEntries,
    checkInCount,
    checkInEntries,
    walkInEntries,
    rsvpd,
    checkedIn,
    onAddressCopy: () => showToast?.("Address copied"),
    onAddWalkIn,
    onRemoveWalkIn,
    saving,
  };

  useEffect(() => {
    if (!game || live) return;
    setPlusOnes(myRsvps[game.id]?.plusOnes ?? 0);
  }, [game, game?.id, live, myRsvps]);

  useEffect(() => {
    if (!game || !live) {
      return;
    }
    setHerePlusOnes(myCheckIns[game.id]?.plusOnes ?? 0);
  }, [game, game?.id, live, myCheckIns]);

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

  if (!game) {
    return <Navigate to="/" replace />;
  }

  const cancelled = game.status === "cancelled";
  const panelClass = [
    "game-detail-panel",
    "surface",
    live ? "game-detail-panel--live" : "",
    approachingStart ? "game-detail-panel--starting-soon" : "",
    ended ? "game-detail-panel--ended" : "",
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

  const commitStrip = (
    <GameCommitStrip
      profile={profile}
      game={game}
      isLive={live}
      isEnded={ended}
      rsvpd={rsvpd}
      checkedIn={checkedIn}
      count={activeCount}
      rsvpCount={rsvpCount}
      rsvpEntries={rsvpEntries}
      checkInEntries={checkInEntries}
      walkInEntries={walkInEntries}
      expanded={stripExpanded}
      onToggleExpanded={() => setStripExpanded((value) => !value)}
      onAddressCopy={() => showToast("Address copied")}
      onAddWalkIn={onAddWalkIn}
      onRemoveWalkIn={onRemoveWalkIn}
      saving={saving}
    />
  );

  return (
    <div className="games-screen games-screen--detail">
      <AppHeader
        profile={profile}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onProfileClick={onProfileClick}
        watching={watching}
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
              compact={commitStrip}
            />
            <GameDetailActions {...actionProps} isEnded={ended} />
          </div>
          {!isWide && (
            <div className="game-detail-layout__thread-wrap">
              {presence && (
                <GameChatThread messages={presence.messages} selfId={presence.self.id} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
