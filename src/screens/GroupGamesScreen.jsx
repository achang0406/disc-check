import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import AppHeader from "../components/layout/AppHeader.jsx";
import GameCommitCard from "../components/games/GameCommitCard.jsx";
import GameChatThread from "../components/presence/GameChatThread.jsx";
import GroupChatPushButton from "../components/games/GroupChatPushButton.jsx";
import EditIcon from "../components/ui/EditIcon.jsx";
import Button from "../components/ui/Button.jsx";
import { gamesForGroup } from "../lib/data.js";
import { useGameClock } from "../hooks/useGameClock.js";
import { canShowChatPushBell } from "../lib/push.js";
import { getPresenceUsers } from "../utils/presenceUsers.js";
import { sortGamesForLanding } from "../utils/gameSchedule.js";

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
  onEditGame,
  onEditGroup,
}) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const now = useGameClock();

  const group = groups.find((item) => item.id === groupId) ?? null;
  const groupGames = useMemo(
    () => sortGamesForLanding(gamesForGroup(games, groupId), now),
    [games, groupId, now],
  );

  const watching = useMemo(
    () =>
      getPresenceUsers({
        self: presence?.self,
        watchingPeers: presence?.watchingPeers,
        connected: presence?.connected,
      }),
    [presence],
  );

  const showBack = groups.length > 1;

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
        showInstallLink
        leading={
          showBack ? (
            <Button
              variant="icon"
              className="app-header__back"
              onClick={() => navigate("/")}
              aria-label="All groups"
            >
              ←
            </Button>
          ) : null
        }
      />

      <main className="games-screen__main games-screen__main--detail">
        <div className="group-games-screen__intro">
          <div className="group-games-screen__title-row">
            <h1 className="group-games-screen__title">{group.name}</h1>
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
          {canShowChatPushBell() && (
            <div className="group-games-screen__bell">
              <GroupChatPushButton
                groupId={group.id}
                subscriberId={presence?.self?.id ?? ""}
              />
            </div>
          )}
        </div>

        <div className="game-detail-layout game-detail-layout--responsive group-games-screen__layout">
          <div className="group-games-screen__cards">
            {groupGames.length === 0 ? (
              <p className="group-games-screen__empty">
                {isAdmin ? "No games yet — tap Add game to create one." : "No games scheduled."}
              </p>
            ) : (
              groupGames.map((game, index) => (
                <div
                  key={game.id}
                  style={{ animation: `fadeUp ${0.15 + index * 0.04}s ease` }}
                >
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
                  />
                </div>
              ))
            )}
          </div>

          <div className="game-detail-layout__thread-wrap">
            {presence && (
              <GameChatThread
                messages={presence.messages}
                selfId={presence.self.id}
                loading={presence.messagesLoading}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
