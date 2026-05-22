import { BrowserRouter, Route, Routes, useMatch } from "react-router-dom";
import FieldBackground from "./components/layout/FieldBackground.jsx";
import LoadingScreen from "./components/layout/LoadingScreen.jsx";
import Toast from "./components/layout/Toast.jsx";
import SignUpModal from "./components/auth/SignUpModal.jsx";
import EditProfileModal from "./components/auth/EditProfileModal.jsx";
import AdminLoginModal from "./components/auth/AdminLoginModal.jsx";
import MobileChatBar from "./components/presence/MobileChatBar.jsx";
import PresenceLayer from "./components/presence/PresenceLayer.jsx";
import GameFormModal from "./components/games/GameFormModal.jsx";
import DeleteGameModal from "./components/games/DeleteGameModal.jsx";
import { useAppData } from "./hooks/useAppData.js";
import { useAdminActions } from "./hooks/useAdmin.js";
import { useAdminSession } from "./hooks/useAdminSession.js";
import { usePresence } from "./hooks/usePresence.js";
import { useTheme } from "./hooks/useTheme.js";
import { useToast } from "./hooks/useToast.js";
import GamesLandingScreen from "./screens/GamesLandingScreen.jsx";
import GameDetailScreen from "./screens/GameDetailScreen.jsx";
import { globalStyles } from "./styles/theme.js";

function AppRoutes() {
  const { toast, showToast } = useToast();
  const { theme, toggleTheme, cssVars } = useTheme();
  const app = useAppData(showToast);
  const presence = usePresence(app.profile);
  const adminSession = useAdminSession();
  const admin = useAdminActions({ showToast, refresh: app.refresh });
  const isLanding = useMatch({ path: "/", end: true });
  const isDetail = useMatch("/games/:gameId");

  if (app.loading) {
    return <LoadingScreen cssVars={cssVars} />;
  }

  const detailProps = {
    profile: app.profile,
    games: app.gamesMeta,
    rsvps: app.rsvps,
    checkIns: app.checkIns,
    myRsvps: app.myRsvps,
    myCheckIns: app.myCheckIns,
    savingGameId: app.savingGameId,
    isRsvpd: app.isRsvpd,
    isCheckedIn: app.isCheckedIn,
    onRequestRsvp: app.handleRequestRsvp,
    onCancel: app.handleCancel,
    onRequestCheckIn: app.handleRequestCheckIn,
    onCheckOut: app.handleCheckOut,
    onProfileClick: app.openEditProfile,
    theme,
    onToggleTheme: toggleTheme,
  };

  return (
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
      {isDetail && (
        <PresenceLayer
          others={presence.others}
          self={presence.self}
          cursor={presence.cursor}
          localChat={presence.localChat}
          connected={presence.connected}
          isMobile={presence.isMobile}
        />
      )}
      <Toast toast={toast} />
      <style>{globalStyles}</style>

      {app.showSignUp && (
        <SignUpModal
          saving={!!app.savingGameId}
          onSubmit={app.handleSignUp}
          onClose={app.closeSignUp}
        />
      )}

      {app.showEditProfile && app.profile && (
        <EditProfileModal
          profile={app.profile}
          saving={app.savingGameId === "profile"}
          onSubmit={app.handleUpdateProfile}
          onClose={app.closeEditProfile}
        />
      )}

      {isLanding && admin.showLogin && (
        <AdminLoginModal
          saving={false}
          onSubmit={(passcode) => {
            const ok = adminSession.login(passcode);
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

      {isDetail && (
        <MobileChatBar
          inputRef={presence.chatInputRef}
          value={presence.draft}
          onChange={presence.setMobileDraft}
          onSend={presence.sendChat}
          connected={presence.connected}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
