export default function LoadingScreen({ cssVars }) {
  return (
    <div
      className="app-shell"
      style={{
        ...cssVars,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🥏</div>
        <p style={{ color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontSize: 13 }}>loading...</p>
      </div>
    </div>
  );
}
