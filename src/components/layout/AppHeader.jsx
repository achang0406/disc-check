import { useCallback, useEffect, useRef, useState } from "react";
import { getInitials } from "../../utils/format.js";
import Button from "../ui/Button.jsx";
import WatchingCluster from "../presence/WatchingCluster.jsx";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

function LogoutIcon() {
  return (
    <svg className="games-screen__admin-logout-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 12H8M17 9l3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  watching,
}) {
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) {
      setAdminMenuOpen(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!adminMenuOpen) return undefined;

    const dismiss = (event) => {
      if (adminMenuRef.current?.contains(event.target)) return;
      setAdminMenuOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setAdminMenuOpen(false);
      }
    };

    const autoHideTimer = window.setTimeout(() => {
      setAdminMenuOpen(false);
    }, 3000);

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(autoHideTimer);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [adminMenuOpen]);

  const handleAdminLogout = useCallback(() => {
    setAdminMenuOpen(false);
    onAdminLogout?.();
  }, [onAdminLogout]);

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
            <div className="games-screen__admin-menu" ref={adminMenuRef}>
              <button
                type="button"
                className="games-screen__admin-badge"
                aria-expanded={adminMenuOpen}
                aria-haspopup="true"
                aria-label="Admin menu"
                onMouseDown={suppressMouseFocus}
                onClick={() => setAdminMenuOpen((open) => !open)}
              >
                ADMIN
              </button>
              {adminMenuOpen && (
                <Button
                  variant="icon"
                  className="games-screen__admin-link"
                  onClick={handleAdminLogout}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogoutIcon />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {watching?.length > 0 ? (
        <div className="app-header__center">
          <WatchingCluster watchers={watching} />
        </div>
      ) : null}

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
            aria-label="Add game"
            title="Add game"
          >
            <span className="games-screen__add-game-icon" aria-hidden="true">
              +
            </span>
            <span className="games-screen__add-game-label">Add game</span>
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
          <button
            type="button"
            className="app-header__profile"
            onClick={onProfileClick}
            onMouseDown={suppressMouseFocus}
          >
            <div className="app-header__avatar">{getInitials(profile.name)}</div>
            <span className="app-header__profile-name">{profile.name}</span>
          </button>
        )}
      </div>
    </header>
  );
}
