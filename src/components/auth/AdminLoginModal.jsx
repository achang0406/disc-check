import { useState } from "react";
import { card, input, label } from "../../styles/theme.js";

export default function AdminLoginModal({ saving, onSubmit, onClose }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!passcode.trim()) {
      setError("Enter the admin passcode");
      return;
    }

    setError("");
    const ok = onSubmit(passcode.trim());
    if (!ok) {
      setError("Incorrect passcode");
    }
  };

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
          Admin access
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
          Enter the passcode to manage games
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Passcode</label>
          <input
            style={input}
            type="password"
            value={passcode}
            onChange={(event) => {
              setPasscode(event.target.value);
              setError("");
            }}
            autoFocus
            onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
          />
        </div>

        {error && (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#f87171", fontFamily: "'DM Mono',monospace" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 10,
              background: saving ? "#0d3320" : "#166534",
              border: "1px solid #22c55e",
              color: "#4ade80",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Unlock admin
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
              cursor: "pointer",
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
