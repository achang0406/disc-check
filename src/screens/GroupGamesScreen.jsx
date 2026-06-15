import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../components/layout/AppHeader.jsx";
import GameCommitCard from "../components/games/GameCommitCard.jsx";
import GameCardsCarousel from "../components/games/GameCardsCarousel.jsx";
import GameCardEmptyState from "../components/games/GameCardEmptyState.jsx";
import GameChatThread from "../components/presence/GameChatThread.jsx";
import ChatBar from "../components/presence/ChatBar.jsx";
import GroupChatPushButton from "../components/games/GroupChatPushButton.jsx";
import WalkthroughOverlay from "../components/walkthrough/WalkthroughOverlay.jsx";
import EditIcon from "../components/ui/EditIcon.jsx";
import Button from "../components/ui/Button.jsx";
import { gamesForGroup } from "../lib/data.js";
import { useGameClock } from "../hooks/useGameClock.js";
import { useGroupWalkthrough, shouldShowGroupWalkthrough } from "../hooks/useGroupWalkthrough.js";
import { WALKTHROUGH_GAME_SLIDE_INDEX } from "../constants/walkthrough.js";
import { canShowChatPushBell } from "../lib/push.js";
import { getPresenceUsers } from "../utils/presenceUsers.js";
import { isGameEnded, sortGamesForLanding } from "../utils/gameSchedule.js";
import { markBackToLanding } from "../utils/landingNavigation.js";
import { useObservedAlerts } from "../hooks/useObservedAlerts.js";

export default function GroupGamesScreen({
  profile,
  groups,
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
  isAdmin,
  onAdminLoginClick,
  onAdminLogout,
  onAddGame,
  addGameDisabled = false,
  addGameDisabledReason = "Maximum 7 games per group",
  onEditGame,
  onEditGroup,
}) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useGameClock();
  const [focusedGameIndex, setFocusedGameIndex] = useState(0);
  const carouselRef = useRef(null);
  const deepLinkHandledRef = useRef(false);

  const group = groups.find((item) => item.id === groupId) ?? null;
  const groupGames = useMemo(
    () => sortGamesForLanding(gamesForGroup(games, groupId), now),
    [games, groupId, now],
  );

  const walkthrough = useGroupWalkthrough({ hasGames: groupGames.length > 0 });
  const showWalkthrough = shouldShowGroupWalkthrough(groupGames.length > 0);

  useObservedAlerts({
    games,
    groupGames,
    rsvps,
    checkIns,
    guests,
    now,
  });

  useEffect(() => {
    if (focusedGameIndex >= groupGames.length) {
      setFocusedGameIndex(0);
    }
  }, [focusedGameIndex, groupGames.length]);

  useEffect(() => {
    deepLinkHandledRef.current = false;
  }, [groupId]);

  useEffect(() => {
    const gameId = searchParams.get("game");
    if (!gameId || groupGames.length === 0 || deepLinkHandledRef.current) return;

    const index = groupGames.findIndex((item) => item.id === gameId);
    if (index < 0) return;

    deepLinkHandledRef.current = true;
    carouselRef.current?.scrollToSlide(index, "auto");
    setFocusedGameIndex(index);

    const next = new URLSearchParams(searchParams);
    next.delete("game");
    setSearchParams(next, { replace: true });
  }, [groupGames, searchParams, setSearchParams]);

  const watching = useMemo(
    () =>
      getPresenceUsers({
        self: presence?.self,
        watchingPeers: presence?.watchingPeers,
        connected: presence?.connected,
      }),
    [presence],
  );

  const focusedGameEnded = useMemo(() => {
    const game = groupGames[focusedGameIndex];
    return game ? isGameEnded(game, now) : false;
  }, [groupGames, focusedGameIndex, now]);

  if (!group) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="games-screen games-screen--detail games-screen--group">
      <AppHeader
        profile={profile}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onProfileClick={onProfileClick}
        watching={watching}
        showAdmin
        adminAvailable
        isAdmin={isAdmin}
        onAdminLoginClick={onAdminLoginClick}
        onAdminLogout={onAdminLogout}
        onAddGame={onAddGame}
        addGameDisabled={addGameDisabled}
        addGameDisabledReason={addGameDisabledReason}
        showAddGame={groupGames.length > 0}
        leading={
          <Button
            variant="icon"
            className="app-header__back"
            onClick={() => {
              if (groups.length > 1) {
                navigate("/");
                return;
              }
              markBackToLanding();
              navigate("/");
            }}
            aria-label="All groups"
          >
            ←
          </Button>
        }
      />

      <main className="games-screen__main games-screen__main--detail">
        <div className="group-games-screen__top">
          <div className="group-games-screen__intro">
            <div className="group-games-screen__title-row">
              <h1 className="group-games-screen__title">{group.name}</h1>
              {canShowChatPushBell() && (
                <div className="group-games-screen__bell">
                  <GroupChatPushButton
                    groupId={group.id}
                    subscriberId={presence?.self?.id ?? ""}
                  />
                </div>
              )}
              {isAdmin && (
                <Button
                  variant="icon"
                  className="game-card__edit-btn"
                  onClick={onEditGroup}
                  aria-label={`Edit ${group.name}`}
                  title={`Edit ${group.name}`}
                >
                  <EditIcon />
                </Button>
              )}
            </div>
            {group.description ? (
              <p className="group-games-screen__description">{group.description}</p>
            ) : null}
          </div>

          <div className="group-games-screen__cards">
            {groupGames.length === 0 ? (
              <div className="game-cards-carousel game-cards-carousel--static">
                <div className="game-cards-carousel__track">
                  <div className="game-cards-carousel__slide">
                    <GameCardEmptyState
                      isAdmin={isAdmin}
                      onAddGame={onAddGame}
                      addGameDisabled={addGameDisabled}
                      addGameDisabledReason={addGameDisabledReason}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <GameCardsCarousel
                ref={carouselRef}
                games={groupGames}
                onFocusedIndexChange={setFocusedGameIndex}
                renderSlide={(game, index) => (
                  <GameCommitCard
                    profile={profile}
                    game={game}
                    rsvps={rsvps}
                    checkIns={checkIns}
                    guests={guests}
                    myRsvps={myRsvps}
                    myCheckIns={myCheckIns}
                    savingGameId={savingGameId}
                    isRsvpd={isRsvpd}
                    isCheckedIn={isCheckedIn}
                    onRequestRsvp={onRequestRsvp}
                    onCancel={onCancel}
                    onRequestCheckIn={onRequestCheckIn}
                    onCheckOut={onCheckOut}
                    onAddWalkIn={onAddWalkIn}
                    onRemoveWalkIn={onRemoveWalkIn}
                    showToast={showToast}
                    isAdmin={isAdmin}
                    onEditGame={onEditGame}
                    walkthroughAnchorActive={
                      showWalkthrough && index === WALKTHROUGH_GAME_SLIDE_INDEX
                    }
                  />
                )}
              />
            )}
          </div>
        </div>

        <div className="group-games-screen__chat-zone game-detail-layout game-detail-layout--responsive">
          <div className="game-detail-layout__thread-wrap">
            {presence && (
              <GameChatThread
                messages={presence.messages}
                selfId={presence.self.id}
                reactionsByMessageId={presence.reactionsByMessageId}
                onToggleReaction={presence.toggleReaction}
                loading={presence.messagesLoading}
              />
            )}
          </div>

          {presence && (
            <ChatBar
              inputRef={presence.chatInputRef}
              value={presence.draft}
              onChange={presence.setThreadDraft}
              onSend={presence.sendChat}
              connected={presence.connected}
              gameEnded={focusedGameEnded}
            />
          )}
        </div>
      </main>

      {showWalkthrough && walkthrough.isActive && walkthrough.currentStep && (
        <WalkthroughOverlay
          step={walkthrough.currentStep}
          stepIndex={walkthrough.stepIndex}
          totalSteps={walkthrough.totalSteps}
          canGoBack={walkthrough.canGoBack}
          onNext={walkthrough.next}
          onBack={walkthrough.back}
          onSkip={walkthrough.skip}
        />
      )}
    </div>
  );
}
