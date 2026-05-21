import { card } from "../../styles/theme.js";

export default function DeleteGameModal({ game, saving, onConfirm, onClose }) {
  if (!game) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{ ...card, maxWidth: 400, width: "100%", boxShadow: "0 0 0 1px var(--input-border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>
          Delete game?
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", lineHeight: 1.5 }}>
          This will permanently delete <strong style={{ color: "var(--text)" }}>{game.name}</strong> and all RSVPs for it.
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 10,
              background: saving ? "#3d1a1a" : "#7f1d1d",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {saving ? "Deleting..." : "Delete game"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--card-bg)",
              border: "1px solid var(--input-border)",
              color: "var(--text-subtle)",
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
