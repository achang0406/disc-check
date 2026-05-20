import { useState } from "react";
import { input, label } from "../../styles/theme.js";

const DEFAULT_FORM = {
  name: "",
  location: "",
  city: "",
  time: "",
  type: "small",
  target: 8,
  status: "open",
};

export default function GameForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || DEFAULT_FORM);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

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
          <label style={label}>Date & Time</label>
          <input
            style={input}
            value={form.time}
            onChange={(event) => setField("time", event.target.value)}
            placeholder="Sat 10:00 AM"
          />
        </div>
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
            <option value="small">Small (8+)</option>
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
          onClick={() => onSave(form)}
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
