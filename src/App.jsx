import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes, useMatch } from "react-router-dom";
import FieldBackground from "./components/layout/FieldBackground.jsx";
import LoadingScreen from "./components/layout/LoadingScreen.jsx";
import Toast from "./components/layout/Toast.jsx";
import SignUpModal from "./components/auth/SignUpModal.jsx";
import EditProfileModal from "./components/auth/EditProfileModal.jsx";
import AdminLoginModal from "./components/auth/AdminLoginModal.jsx";
import PresenceLayer from "./components/presence/PresenceLayer.jsx";
import ChatBar from "./components/presence/ChatBar.jsx";
import GameFormModal from "./components/games/GameFormModal.jsx";
import DeleteGameModal from "./components/games/DeleteGameModal.jsx";
import { useAppData } from "./hooks/useAppData.js";
import { useAdminActions } from "./hooks/useAdmin.js";
import { useAdminSession } from "./hooks/useAdminSession.js";
import { usePresence } from "./hooks/usePresence.js";
import { useBreakpoint } from "./hooks/useBreakpoint.js";
import { useGameClock } from "./hooks/useGameClock.js";
import { useTheme } from "./hooks/useTheme.js";
import { useToast } from "./hooks/useToast.js";
import GamesLandingScreen from "./screens/GamesLandingScreen.jsx";
import GameDetailScreen from "./screens/GameDetailScreen.jsx";
import { globalStyles } from "./styles/theme.js";
import { isGameLive } from "./utils/gameSchedule.js";

function AppRoutes() {
  const { toast, showToast } = useToast();
  const { theme, toggleTheme, cssVars } = useTheme();
  const app = useAppData(showToast);
  const { isWide } = useBreakpoint();
  const now = useGameClock();
  const isLanding = useMatch({ path: "/", end: true });
  const detailMatch = useMatch("/games/:gameId");
  const gameId = detailMatch?.params?.gameId ?? null;
  const presence = usePresence(app.profile, gameId, isWide);
  const glowUserIds = useMemo(() => {
    if (!gameId) return new Set();

    const ids = new Set((app.rsvps[gameId] || []).map((entry) => entry.userId));
    const game = app.gamesMeta.find((item) => item.id === gameId);

    if (game && isGameLive(game, now)) {
      for (const entry of app.checkIns[gameId] || []) {
        ids.add(entry.userId);
      }
    }

    return ids;
  }, [gameId, app.rsvps, app.checkIns, app.gamesMeta, now]);
  const adminSession = useAdminSession();
  const admin = useAdminActions({ showToast, refresh: app.refresh });
  const [loadingOverlay, setLoadingOverlay] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);

  useEffect(() => {
    if (app.loading) {
      setLoadingOverlay(true);
      setLoadingExiting(false);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLoadingOverlay(false);
      setLoadingExiting(false);
      return;
    }
    setLoadingExiting(true);
  }, [app.loading]);

  const handleLoadingTransitionEnd = (event) => {
    if (event.propertyName !== "opacity" || !loadingExiting) return;
    setLoadingOverlay(false);
    setLoadingExiting(false);
  };

  const detailProps = {
    profile: app.profile,
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
      {detailMatch && (
        <PresenceLayer
          others={presence.others}
          self={presence.self}
          cursor={presence.cursor}
          localChat={presence.localChat}
          draft={presence.draft}
          connected={presence.connected}
          isWide={presence.isWide}
          rsvpUserIds={glowUserIds}
        />
      )}
      <Toast toast={toast} />

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

      {isLanding && admin.showLogin && (
        <AdminLoginModal
          saving={false}
          onSubmit={async (passcode) => {
            const ok = await adminSession.login(passcode);
            if (ok) admin.setShowLogin(false);
            return ok;
          }}
          onClose={() => admin.setShowLogin(false)}
        />
      )}

      {isLanding && admin.modal && (
        <GameFormModal
          mode={admin.modal.mode}
          initial={admin.modal.mode === "edit" ? admin.modal.game : null}
          saving={admin.saving}
          onSave={admin.saveGame}
          onClose={admin.closeModal}
          onDelete={admin.modal.mode === "edit" ? admin.requestDelete : undefined}
        />
      )}

      {isLanding && admin.deleteTarget && (
        <DeleteGameModal
          game={admin.deleteTarget}
          saving={admin.saving}
          onConfirm={admin.executeDelete}
          onClose={admin.closeDelete}
        />
      )}

      <Routes>
        <Route
          path="/"
          element={
            <GamesLandingScreen
              profile={app.profile}
              games={app.gamesMeta}
              rsvps={app.rsvps}
              checkIns={app.checkIns}
              guests={app.guests}
              isRsvpd={app.isRsvpd}
              isCheckedIn={app.isCheckedIn}
              onProfileClick={app.openEditProfile}
              theme={theme}
              onToggleTheme={toggleTheme}
              adminAvailable={adminSession.adminAvailable}
              isAdmin={adminSession.isAdmin}
              onAdminLoginClick={() => admin.setShowLogin(true)}
              onAdminLogout={adminSession.logout}
              onAddGame={admin.openCreate}
              onEditGame={admin.openEdit}
            />
          }
        />
        <Route path="/games/:gameId" element={<GameDetailScreen {...detailProps} />} />
      </Routes>

      {detailMatch && (
        <ChatBar
          isWide={presence.isWide}
          inputRef={presence.chatInputRef}
          value={presence.draft}
          onChange={presence.setThreadDraft}
          onSend={presence.sendChat}
          connected={presence.connected}
          showAlertsToggle
        />
      )}
    </div>
      )}
      {loadingOverlay && (
        <LoadingScreen
          cssVars={cssVars}
          exiting={loadingExiting}
          onTransitionEnd={handleLoadingTransitionEnd}
        />
      )}
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
