import { useState } from "react";
import { colorForId } from "../../constants/presence.js";
import { card, input, label } from "../../styles/theme.js";
import ColorWheel, { HexColorInput } from "./ColorWheel.jsx";

export default function EditProfileModal({ profile, saving, onSubmit, onClose }) {
  const [name, setName] = useState(profile.name);
  const [bubbleColor, setBubbleColor] = useState(
    profile.bubbleColor || colorForId(profile.id),
  );
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("enter your name");
      return;
    }

    setError("");
    onSubmit({ name: trimmedName, bubbleColor });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{ ...card, maxWidth: 400, width: "100%", border: "1px solid #2a2a2a" }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#f0f0f0" }}>
          Edit profile
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Name</label>
          <input
            style={input}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="e.g. Alex Rivera"
            autoFocus
            onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Speech bubble color</label>
          <ColorWheel color={bubbleColor} onChange={setBubbleColor} />
          <HexColorInput color={bubbleColor} onChange={setBubbleColor} />
          <div
            style={{
              marginTop: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 10,
              background: bubbleColor,
              color: "#0a0a0a",
              fontSize: 13,
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            preview bubble
          </div>
        </div>

        {error && (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#f87171", fontFamily: "'DM Mono',monospace" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
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
            {saving ? "saving..." : "Save"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#111",
              border: "1px solid #2a2a2a",
              color: "#888",
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
