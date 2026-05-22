import { useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";
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
    <ModalShell
      wide
      title={mode === "edit" ? "Edit game" : "Add game"}
      description={mode === "edit" ? "Update pickup details" : "Create a new weekly pickup"}
      onClose={onClose}
      stackFooter={mode === "edit" && !!onDelete}
      footer={
        <>
          <Button variant="primary" block disabled={saving} onClick={handleSubmit}>
            {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create game"}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          {mode === "edit" && onDelete && (
            <Button variant="danger" block disabled={saving} onClick={onDelete}>
              Delete game
            </Button>
          )}
        </>
      }
    >
      <Field label="Name">
        <input
          className="field__input"
          value={form.name}
          onChange={(event) => {
            setField("name", event.target.value);
            setError("");
          }}
          placeholder="Wednesday Night Disc"
        />
      </Field>

      <div className="field-grid">
        <Field label="Location label">
          <input
            className="field__input"
            value={form.location}
            onChange={(event) => setField("location", event.target.value)}
            placeholder="Heritage Park"
          />
        </Field>
        <Field label="Address">
          <input
            className="field__input"
            value={form.address}
            onChange={(event) => setField("address", event.target.value)}
            placeholder="11100 NE 68th St, Kirkland, WA"
          />
        </Field>
      </div>

      <div className="field-grid">
        <Field label="Weekly start time">
          <input
            className="field__input"
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => setField("startsAt", event.target.value)}
          />
        </Field>
        <Field label="Status">
          <select
            className="field__input"
            value={form.status}
            onChange={(event) => setField("status", event.target.value)}
          >
            <option value="open">Open</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
      </div>

      <div className="field-grid">
        <Field label="Game size">
          <select
            className="field__input"
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
        </Field>
        <Field label="Player target">
          <input
            className="field__input"
            type="number"
            min={2}
            max={40}
            value={form.target}
            onChange={(event) => setField("target", parseInt(event.target.value, 10) || 8)}
          />
        </Field>
      </div>

      {error && <p className="field__error">{error}</p>}
    </ModalShell>
  );
}
