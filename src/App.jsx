import FieldBackground from "./components/layout/FieldBackground.jsx";
import LoadingScreen from "./components/layout/LoadingScreen.jsx";
import Toast from "./components/layout/Toast.jsx";
import SignUpModal from "./components/auth/SignUpModal.jsx";
import EditProfileModal from "./components/auth/EditProfileModal.jsx";
import PresenceLayer from "./components/presence/PresenceLayer.jsx";
import { useAppData } from "./hooks/useAppData.js";
import { usePresence } from "./hooks/usePresence.js";
import { useToast } from "./hooks/useToast.js";
import GamesListScreen from "./screens/GamesListScreen.jsx";
import { globalStyles } from "./styles/theme.js";

export default function App() {
  const { toast, showToast } = useToast();
  const app = useAppData(showToast);
  const presence = usePresence(app.profile);

  if (app.loading) {
    return <LoadingScreen />;
  }

  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily: "'DM Sans',sans-serif",
        color: "#e8e8e8",
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
      />
    </div>
  );
}
