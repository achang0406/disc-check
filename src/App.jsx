import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useMatch } from "react-router-dom";
import FieldBackground from "./components/layout/FieldBackground.jsx";
import LoadingScreen, { LOADING_EXIT_MS } from "./components/layout/LoadingScreen.jsx";
import Toast from "./components/layout/Toast.jsx";
import SignUpModal from "./components/auth/SignUpModal.jsx";
import EditProfileModal from "./components/auth/EditProfileModal.jsx";
import AdminLoginModal from "./components/auth/AdminLoginModal.jsx";
import GameFormModal from "./components/games/GameFormModal.jsx";
import DeleteGameModal from "./components/games/DeleteGameModal.jsx";
import GroupFormModal from "./components/groups/GroupFormModal.jsx";
import CreateGroupModal from "./components/groups/CreateGroupModal.jsx";
import { useAppData } from "./hooks/useAppData.js";
import { logoutAllGroupAdmins } from "./hooks/adminSessionEvents.js";
import { useGroupAdminActions } from "./hooks/useGroupAdmin.js";
import { useGroupAdminSession } from "./hooks/useGroupAdminSession.js";
import { usePlatformAdminActions } from "./hooks/usePlatformAdmin.js";
import { usePlatformAdminSession } from "./hooks/usePlatformAdminSession.js";
import { usePresence } from "./hooks/usePresence.js";
import { useTheme } from "./hooks/useTheme.js";
import { useToast } from "./hooks/useToast.js";
import { useServiceWorkerNavigation } from "./hooks/useServiceWorkerNavigation.js";
import { useChatAlerts } from "./hooks/useChatAlerts.js";
import GroupsLandingScreen from "./screens/GroupsLandingScreen.jsx";
import GroupGamesScreen from "./screens/GroupGamesScreen.jsx";
import { useAppResume } from "./hooks/useAppResume.js";
import { resyncGroupChatPushSubscription } from "./lib/push.js";
import { globalStyles } from "./styles/theme.js";

function AppRoutes() {
  const { toast, exiting, showToast, dismissToast } = useToast();
  const { theme, toggleTheme, cssVars } = useTheme();
  const app = useAppData(showToast);
  const location = useLocation();
  const groupMatch = useMatch("/groups/:groupId");
  const groupId = groupMatch?.params?.groupId ?? null;
  const landingMatch = useMatch({ path: "/", end: true });
  const prevPathRef = useRef(null);
  const detailGroup = useMemo(
    () => (groupId ? app.groupsMeta.find((item) => item.id === groupId) ?? null : null),
    [groupId, app.groupsMeta],
  );
  const groupGames = useMemo(
    () => (groupId ? app.gamesMeta.filter((game) => game.groupId === groupId) : []),
    [groupId, app.gamesMeta],
  );
  const addGameDisabled = groupGames.length >= 7;
  const addGameDisabledReason = "Maximum 7 games per group";
  const presence = usePresence(app.profile, groupId, detailGroup?.name ?? "");
  const groupAdminSession = useGroupAdminSession(groupId ?? "");
  const platformAdminSession = usePlatformAdminSession();
  const groupAdmin = useGroupAdminActions({
    groupId: groupId ?? "",
    showToast,
    refresh: app.refresh,
    groupGameCount: groupGames.length,
  });
  const platformAdmin = usePlatformAdminActions({
    showToast,
    refresh: app.refresh,
  });
  const [loadingVisible, setLoadingVisible] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);

  useAppResume();

  useEffect(() => {
    const prevPath = prevPathRef.current;
    if (prevPath !== null && prevPath !== location.pathname) {
      platformAdminSession.logout();
      logoutAllGroupAdmins();
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, platformAdminSession.logout]);

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
    if (app.loading) {
      setLoadingExiting(false);
      setLoadingVisible(true);
      return undefined;
    }

    let exitTimer;
    const raf = window.requestAnimationFrame(() => {
      setLoadingExiting(true);
      const exitMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : LOADING_EXIT_MS;
      exitTimer = window.setTimeout(() => {
        setLoadingVisible(false);
        setLoadingExiting(false);
      }, exitMs);
    });

    return () => {
      window.cancelAnimationFrame(raf);
      if (exitTimer) window.clearTimeout(exitTimer);
    };
  }, [app.loading]);

  const groupScreenProps = {
    profile: app.profile,
    groups: app.groupsMeta,
    games: app.gamesMeta,
    rsvps: app.rsvps,
    checkIns: app.checkIns,
    guests: app.guests,
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
    onAddGame: groupAdmin.openCreate,
    addGameDisabled,
    addGameDisabledReason,
    onEditGame: groupAdmin.openEdit,
    onEditGroup: groupAdmin.openGroupSettings,
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
              onLookupPhone={app.lookupProfileByPhone}
              onRecoverProfile={app.handleRecoverProfile}
            />
          )}

          {landingMatch && platformAdmin.showLogin && (
            <AdminLoginModal
              saving={false}
              title="Platform admin"
              description="Enter the 4-digit passcode to add groups."
              onSubmit={async (passcode) => {
                const ok = await platformAdminSession.login(passcode);
                if (ok) platformAdmin.setShowLogin(false);
                return ok;
              }}
              onClose={() => platformAdmin.setShowLogin(false)}
            />
          )}

          {landingMatch && platformAdmin.createModal && (
            <CreateGroupModal
              saving={platformAdmin.saving}
              onSave={platformAdmin.saveGroup}
              onClose={platformAdmin.closeCreateModal}
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
                  isAdmin={platformAdminSession.isAdmin}
                  onAdminLoginClick={() => platformAdmin.setShowLogin(true)}
                  onAdminLogout={platformAdminSession.logout}
                  onAddGroup={platformAdmin.openCreate}
                />
              }
            />
            <Route path="/groups/:groupId" element={<GroupGamesScreen {...groupScreenProps} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
      {loadingVisible && <LoadingScreen cssVars={cssVars} exiting={loadingExiting} />}
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
