export default function LoadingScreen({ cssVars }) {
  return (
    <div className="loading-screen" style={cssVars} aria-busy="true" aria-live="polite">
      <div className="loading-screen__content">
        <div className="loading-screen__icon" aria-hidden="true">
          🥏
        </div>
        <p className="loading-screen__label">Loading...</p>
      </div>
    </div>
  );
}
