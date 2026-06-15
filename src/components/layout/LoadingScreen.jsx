export const LOADING_EXIT_MS = 480;

export default function LoadingScreen({ cssVars, exiting = false }) {
  return (
    <div
      className={`loading-screen${exiting ? " loading-screen--exiting" : ""}`}
      style={cssVars}
      aria-busy={!exiting}
      aria-live="polite"
    >
      <div className="loading-screen__content">
        <div className="loading-screen__icon" aria-hidden="true">
          🥏
        </div>
        <p className="loading-screen__label">Loading...</p>
      </div>
    </div>
  );
}
