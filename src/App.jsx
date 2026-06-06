import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useMatch } from "react-router-dom";
import FieldBackground from "./components/layout/FieldBackground.jsx";
import LoadingScreen from "./components/layout/LoadingScreen.jsx";
import Toast from "./components/layout/Toast.jsx";
import SignUpModal from "./components/auth/SignUpModal.jsx";
import EditProfileModal from "./components/auth/EditProfileModal.jsx";
import AdminLoginModal from "./components/auth/AdminLoginModal.jsx";
import GameFormModal from "./components/games/GameFormModal.jsx";
import DeleteGameModal from "./components/games/DeleteGameModal.jsx";
import GroupFormModal from "./components/groups/GroupFormModal.jsx";
import { useAppData } from "./hooks/useAppData.js";
import { useGroupAdminActions } from "./hooks/useGroupAdmin.js";
import { useGroupAdminSession } from "./hooks/useGroupAdminSession.js";
import { usePresence } from "./hooks/usePresence.js";
import { useTheme } from "./hooks/useTheme.js";
import { useToast } from "./hooks/useToast.js";
import { useServiceWorkerNavigation } from "./hooks/useServiceWorkerNavigation.js";
import { useChatAlerts } from "./hooks/useChatAlerts.js";
import GroupsLandingScreen from "./screens/GroupsLandingScreen.jsx";
import GroupGamesScreen from "./screens/GroupGamesScreen.jsx";
import { useAppResume } from "./hooks/useAppResume.js";
import { gamesForGroup } from "./lib/data.js";
import { resyncGroupChatPushSubscription } from "./lib/push.js";
import { globalStyles } from "./styles/theme.js";

function AppRoutes() {
  const { toast, exiting, showToast, dismissToast } = useToast();
  const { theme, toggleTheme, cssVars } = useTheme();
  const app = useAppData(showToast);
  const groupMatch = useMatch("/groups/:groupId");
  const groupId = groupMatch?.params?.groupId ?? null;
  const detailGroup = useMemo(
    () => (groupId ? app.groupsMeta.find((item) => item.id === groupId) ?? null : null),
    [groupId, app.groupsMeta],
  );
  const groupGames = useMemo(
    () => (groupId ? gamesForGroup(app.gamesMeta, groupId) : []),
    [groupId, app.gamesMeta],
  );
  const presence = usePresence(app.profile, groupId, detailGroup?.name ?? "");
  const groupAdminSession = useGroupAdminSession(groupId ?? "");
  const groupAdmin = useGroupAdminActions({
    groupId: groupId ?? "",
    showToast,
    refresh: app.refresh,
  });
  const [loadingOverlay, setLoadingOverlay] = useState(true);

  useAppResume();

  const resyncPushSubscription = useCallback(() => {
    const subscriberId = presence?.self?.id;
    if (!groupId || !subscriberId) return;
    void resyncGroupChatPushSubscription({ groupId, subscriberId });
  }, [groupId, presence?.self?.id]);

  useServiceWorkerNavigation({ onPushSubscriptionChange: resyncPushSubscription });

  useChatAlerts({
    gameId: groupId ?? "",
    gameName: detailGroup?.name ?? "",
    messages: presence?.messages ?? [],
    selfId: presence?.self?.id,
    enabled: Boolean(groupId && presence?.connected),
  });

  useEffect(() => {
    setLoadingOverlay(app.loading);
  }, [app.loading]);

  const groupScreenProps = {
    profile: app.profile,
    groups: app.groupsMeta,
    games: app.gamesMeta,
    rsvps: app.rsvps,
    checkIns: app.checkIns,
    guests: app.guests,
    announcements: app.announcements,
    myRsvps: app.myRsvps,
    myCheckIns: app.myCheckIns,
    savingGameId: app.savingGameId,
    isRsvpd: app.isRsvpd,
    isCheckedIn: app.isCheckedIn,
    onRequestRsvp: app.handleRequestRsvp,
    onCancel: app.handleCancel,
    onRequestCheckIn: app.handleRequestCheckIn,
    onCheckOut: app.handleCheckOut,
    onAddWalkIn: app.handleAddWalkIn,
    onRemoveWalkIn: app.handleRemoveWalkIn,
    onProfileClick: app.openEditProfile,
    theme,
    onToggleTheme: toggleTheme,
    presence,
    showToast,
    isAdmin: groupAdminSession.isAdmin,
    onAdminLoginClick: () => groupAdmin.setShowLogin(true),
    onAdminLogout: groupAdminSession.logout,
    onAddGame: () => {
      if (groupGames.length >= 7) {
        showToast("Maximum 7 games per group", "error");
        return;
      }
      groupAdmin.openCreate();
    },
    onEditGame: groupAdmin.openEdit,
    onEditGroup: groupAdmin.openGroupSettings,
    onPostAnnouncement: groupAdmin.postAnnouncement,
    postingAnnouncementGameId: groupAdmin.postingAnnouncementGameId,
  };

  return (
    <>
      <style>{globalStyles}</style>
      {!app.loading && (
        <div
          className="app-shell"
          style={{
            ...cssVars,
            background: "var(--bg)",
            width: "100%",
            fontFamily: "'DM Sans',sans-serif",
            color: "var(--text)",
            position: "relative",
          }}
        >
          <FieldBackground />
          <Toast toast={toast} exiting={exiting} onDismiss={dismissToast} />

          {app.showSignUp && (
            <SignUpModal
              saving={!!app.savingGameId}
              onSubmit={app.handleSignUp}
              onClose={app.closeSignUp}
              onLookupPhone={app.lookupProfileByPhone}
            />
          )}

          {app.showEditProfile && app.profile && (
            <EditProfileModal
              profile={app.profile}
              saving={app.savingGameId === "profile"}
              onSubmit={app.handleUpdateProfile}
              onClose={app.closeEditProfile}
              onValidatePhone={app.validatePhoneForProfile}
              onLookupPhone={app.lookupProfileByPhone}
              onRecoverProfile={app.handleRecoverProfile}
            />
          )}

          {groupMatch && groupAdmin.showLogin && (
            <AdminLoginModal
              saving={false}
              title="Group admin"
              description="Enter this group's 4-digit admin passcode."
              onSubmit={async (passcode) => {
                const ok = await groupAdminSession.login(passcode);
                if (ok) groupAdmin.setShowLogin(false);
                return ok;
              }}
              onClose={() => groupAdmin.setShowLogin(false)}
            />
          )}

          {groupMatch && groupAdmin.groupModal && detailGroup && (
            <GroupFormModal
              group={detailGroup}
              saving={groupAdmin.saving}
              onSave={groupAdmin.saveGroup}
              onClose={groupAdmin.closeGroupModal}
            />
          )}

          {groupMatch && groupAdmin.gameModal && (
            <GameFormModal
              mode={groupAdmin.gameModal.mode}
              initial={groupAdmin.gameModal.mode === "edit" ? groupAdmin.gameModal.game : null}
              groupGames={groupGames}
              saving={groupAdmin.saving}
              onSave={groupAdmin.saveGame}
              onClose={groupAdmin.closeGameModal}
              onDelete={
                groupAdmin.gameModal.mode === "edit" ? groupAdmin.requestDelete : undefined
              }
            />
          )}

          {groupMatch && groupAdmin.deleteTarget && (
            <DeleteGameModal
              game={groupAdmin.deleteTarget}
              saving={groupAdmin.saving}
              onConfirm={groupAdmin.executeDelete}
              onClose={groupAdmin.closeDelete}
            />
          )}

          <Routes>
            <Route
              path="/"
              element={
                <GroupsLandingScreen
                  profile={app.profile}
                  groups={app.groupsMeta}
                  games={app.gamesMeta}
                  onProfileClick={app.openEditProfile}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                />
              }
            />
            <Route path="/groups/:groupId" element={<GroupGamesScreen {...groupScreenProps} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
      {loadingOverlay && <LoadingScreen cssVars={cssVars} />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
