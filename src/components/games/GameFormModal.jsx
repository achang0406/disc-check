import { useState } from "react";
import { card, input, label } from "../../styles/theme.js";
import { fromDatetimeLocalInput, toDatetimeLocalInput } from "../../utils/time.js";

const EMPTY_FORM = {
  name: "",
  location: "",
  address: "",
  startsAt: "",
  type: "goaltimate",
  target: 8,
  status: "open",
};

function buildForm(initial) {
  if (!initial) return EMPTY_FORM;
  return {
    name: initial.name ?? "",
    location: initial.location ?? "",
    address: initial.address ?? "",
    startsAt: toDatetimeLocalInput(initial.startsAt),
    type: initial.type === "small" ? "goaltimate" : initial.type ?? "goaltimate",
    target: initial.target ?? 8,
    status: initial.status ?? "open",
  };
}

export default function GameFormModal({ mode, initial, saving, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(() => buildForm(initial));
  const [error, setError] = useState("");

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = () => {
    const startsAt = fromDatetimeLocalInput(form.startsAt);
    if (!form.name.trim()) {
      setError("Game name is required");
      return;
    }
    if (!form.location.trim()) {
      setError("Location label is required");
      return;
    }
    if (!startsAt) {
      setError("Weekly start time is required");
      return;
    }

    setError("");
    onSave({
      name: form.name.trim(),
      location: form.location.trim(),
      address: form.address.trim(),
      startsAt,
      type: form.type,
      target: Number(form.target) || 8,
      status: form.status,
    });
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
        style={{ ...card, maxWidth: 480, width: "100%", boxShadow: "0 0 0 1px var(--input-border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>
          {mode === "edit" ? "Edit game" : "Add game"}
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
          {mode === "edit" ? "Update pickup details" : "Create a new weekly pickup"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={label}>Name</label>
            <input
              style={input}
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="Wednesday Night Disc"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={label}>Location label</label>
              <input
                style={input}
                value={form.location}
                onChange={(event) => setField("location", event.target.value)}
                placeholder="Heritage Park"
              />
            </div>
            <div>
              <label style={label}>Address</label>
              <input
                style={input}
                value={form.address}
                onChange={(event) => setField("address", event.target.value)}
                placeholder="11100 NE 68th St, Kirkland, WA"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={label}>Weekly start time</label>
              <input
                style={input}
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setField("startsAt", event.target.value)}
              />
            </div>
            <div>
              <label style={label}>Status</label>
              <select
                style={{ ...input, cursor: "pointer" }}
                value={form.status}
                onChange={(event) => setField("status", event.target.value)}
              >
                <option value="open">Open</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={label}>Game size</label>
              <select
                style={{ ...input, cursor: "pointer" }}
                value={form.type}
                onChange={(event) => {
                  const type = event.target.value;
                  setField("type", type);
                  setField("target", type === "big" ? 14 : 8);
                }}
              >
                <option value="goaltimate">Goaltimate (8+)</option>
                <option value="big">Big (14+)</option>
              </select>
            </div>
            <div>
              <label style={label}>Player target</label>
              <input
                style={input}
                type="number"
                min={2}
                max={40}
                value={form.target}
                onChange={(event) => setField("target", parseInt(event.target.value, 10) || 8)}
              />
            </div>
          </div>
        </div>

        {error && (
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#f87171", fontFamily: "'DM Mono',monospace" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
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
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create game"}
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

        {mode === "edit" && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "10px",
              borderRadius: 10,
              background: "var(--status-not-bg)",
              border: "1px solid #7f1d1d",
              color: "#f87171",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Delete game
          </button>
        )}
      </div>
    </div>
  );
}
