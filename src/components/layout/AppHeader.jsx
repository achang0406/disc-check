import { getInitials } from "../../utils/format.js";
import Button from "../ui/Button.jsx";

export default function AppHeader({
  profile,
  theme,
  onToggleTheme,
  onProfileClick,
  adminAvailable,
  isAdmin,
  onAdminLoginClick,
  onAdminLogout,
  onAddGame,
  showAdmin = false,
  leading,
}) {
  return (
    <header className="app-header">
      <div className="app-header__leading">
        {leading}
        <div className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">
            🥏
          </span>
          <span className="app-header__title">DiscCheck</span>
          {showAdmin && isAdmin && (
            <>
              <span className="games-screen__admin-badge">ADMIN</span>
              <Button variant="ghost" className="games-screen__admin-link" onClick={onAdminLogout}>
                Sign out
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="app-header__actions">
        {showAdmin && adminAvailable && !isAdmin && (
          <Button
            variant="icon"
            onClick={onAdminLoginClick}
            aria-label="Admin login"
            title="Admin login"
          >
            🔒
          </Button>
        )}
        {showAdmin && isAdmin && (
          <Button
            variant="ghost"
            className="games-screen__add-game games-screen__add-game--header"
            onClick={onAddGame}
          >
            + Add game
          </Button>
        )}
        <Button
          variant="icon"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </Button>
        {profile && (
          <button type="button" className="app-header__profile" onClick={onProfileClick}>
            <div className="app-header__avatar">{getInitials(profile.name)}</div>
            <span className="app-header__profile-name">{profile.name}</span>
          </button>
        )}
      </div>
    </header>
  );
}
