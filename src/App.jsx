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
import GamesListScreen from "./screens/GamesListScreen.jsx";
import { globalStyles } from "./styles/theme.js";

export default function App() {
  const { toast, showToast } = useToast();
  const { theme, toggleTheme, cssVars } = useTheme();
  const app = useAppData(showToast);
  const presence = usePresence(app.profile);
  const adminSession = useAdminSession();
  const admin = useAdminActions({ showToast, refresh: app.refresh });

  if (app.loading) {
    return <LoadingScreen cssVars={cssVars} />;
  }

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
      <PresenceLayer
        others={presence.others}
        self={presence.self}
        cursor={presence.cursor}
        localChat={presence.localChat}
        connected={presence.connected}
        isMobile={presence.isMobile}
      />
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

      {admin.showLogin && (
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

      {admin.modal && (
        <GameFormModal
          mode={admin.modal.mode}
          initial={admin.modal.mode === "edit" ? admin.modal.game : null}
          saving={admin.saving}
          onSave={admin.saveGame}
          onClose={admin.closeModal}
          onDelete={admin.modal.mode === "edit" ? admin.requestDelete : undefined}
        />
      )}

      {admin.deleteTarget && (
        <DeleteGameModal
          game={admin.deleteTarget}
          saving={admin.saving}
          onConfirm={admin.executeDelete}
          onClose={admin.closeDelete}
        />
      )}

      <GamesListScreen
        profile={app.profile}
        games={app.gamesMeta}
        rsvps={app.rsvps}
        myRsvps={app.myRsvps}
        savingGameId={app.savingGameId}
        isRsvpd={app.isRsvpd}
        onRequestRsvp={app.handleRequestRsvp}
        onCancel={app.handleCancel}
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

      <MobileChatBar
        inputRef={presence.chatInputRef}
        value={presence.draft}
        onChange={presence.setMobileDraft}
        onSend={presence.sendChat}
        connected={presence.connected}
      />
    </div>
  );
}
