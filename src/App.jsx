import FieldBackground from "./components/layout/FieldBackground.jsx";
import LoadingScreen from "./components/layout/LoadingScreen.jsx";
import Toast from "./components/layout/Toast.jsx";
import SignUpModal from "./components/auth/SignUpModal.jsx";
import EditProfileModal from "./components/auth/EditProfileModal.jsx";
import MobileChatBar from "./components/presence/MobileChatBar.jsx";
import PresenceLayer from "./components/presence/PresenceLayer.jsx";
import { useAppData } from "./hooks/useAppData.js";
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

  if (app.loading) {
    return <LoadingScreen cssVars={cssVars} />;
  }

  return (
    <div
      style={{
        ...cssVars,
        background: "var(--bg)",
        minHeight: "100vh",
        width: "100%",
        fontFamily: "'DM Sans',sans-serif",
        color: "var(--text)",
        position: "relative",
      }}
    >
      <FieldBackground />
      <PresenceLayer {...presence} />
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
        isMobile={presence.isMobile}
      />

      {presence.isMobile && (
        <MobileChatBar
          value={presence.draft}
          onChange={presence.setMobileDraft}
          onSend={presence.sendChat}
          connected={presence.connected}
        />
      )}
    </div>
  );
}
