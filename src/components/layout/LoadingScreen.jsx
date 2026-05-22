export default function LoadingScreen({ cssVars, exiting = false, onTransitionEnd }) {
  return (
    <div
      className={`loading-screen${exiting ? " loading-screen--exiting" : ""}`}
      style={cssVars}
      onTransitionEnd={onTransitionEnd}
      aria-busy={!exiting}
      aria-live="polite"
    >
      <div className="loading-screen__content">
        <div className="loading-screen__icon" aria-hidden="true">
          🥏
        </div>
        <p className="loading-screen__label">loading...</p>
      </div>
    </div>
  );
}
