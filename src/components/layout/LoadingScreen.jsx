export default function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        background: "#0a0a0a",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🥏</div>
        <p style={{ color: "#555", fontFamily: "'DM Mono',monospace", fontSize: 13 }}>loading...</p>
      </div>
    </div>
  );
}
