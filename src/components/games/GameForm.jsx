import { useState } from "react";
import { input, label } from "../../styles/theme.js";
import { fromDatetimeLocalInput, toDatetimeLocalInput } from "../../utils/time.js";

const DEFAULT_FORM = {
  name: "",
  location: "",
  city: "",
  startsAt: "",
  type: "goaltimate",
  target: 8,
  status: "open",
};

export default function GameForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    if (!initial) return DEFAULT_FORM;
    return {
      ...initial,
      startsAt: toDatetimeLocalInput(initial.startsAt),
    };
  });

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = () => {
    const startsAt = fromDatetimeLocalInput(form.startsAt);
    if (!startsAt) return;
    onSave({ ...form, startsAt });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={label}>Game name</label>
          <input
            style={input}
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            placeholder="e.g. Riverside Flats"
          />
        </div>
        <div>
          <label style={label}>City</label>
          <input
            style={input}
            value={form.city}
            onChange={(event) => setField("city", event.target.value)}
            placeholder="e.g. Seattle, WA"
          />
        </div>
      </div>
      <div>
        <label style={label}>Location / Field</label>
        <input
          style={input}
          value={form.location}
          onChange={(event) => setField("location", event.target.value)}
          placeholder="e.g. Riverside Park — Field 3"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
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
          <label style={label}>Game size</label>
          <select
            style={{ ...input, cursor: "pointer" }}
            value={form.type === "small" ? "goaltimate" : form.type}
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
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 8,
            background: "#0d4f2e",
            border: "1px solid #22c55e",
            color: "#4ade80",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          {initial ? "Save changes" : "Create game"}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: "#111",
            border: "1px solid #2a2a2a",
            color: "#888",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
