import { useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";
import SelectField from "../ui/SelectField.jsx";
import {
  DEFAULT_GAME_TIMEZONE,
  GAME_TIMEZONE_OPTIONS,
  WEEKDAY_OPTIONS,
} from "../../constants/gameSchedule.js";
import { formatSchedulePreview, fromTimeInputValue, toTimeInputValue } from "../../utils/time.js";

const GAME_TYPE_OPTIONS = [
  { value: "goaltimate", label: "Goaltimate", hint: "8+" },
  { value: "big", label: "Biggie", hint: "14+" },
];

const GAME_STATUS_OPTIONS = [
  { value: "open", label: "Open", tone: "positive" },
  { value: "cancelled", label: "Cancelled", tone: "danger" },
];

const EMPTY_FORM = {
  name: "",
  location: "",
  address: "",
  weekday: 3,
  startTime: "18:00:00",
  timezone: DEFAULT_GAME_TIMEZONE,
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
    weekday: initial.weekday ?? 3,
    startTime: initial.startTime ?? "18:00:00",
    timezone: initial.timezone ?? DEFAULT_GAME_TIMEZONE,
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
    const startTime = fromTimeInputValue(form.startTime);
    if (!form.name.trim()) {
      setError("Game name is required");
      return;
    }
    if (!form.location.trim()) {
      setError("Location is required");
      return;
    }
    if (form.weekday == null || form.weekday === "") {
      setError("Day of week is required");
      return;
    }
    if (!startTime) {
      setError("Start time is required");
      return;
    }

    setError("");
    onSave({
      name: form.name.trim(),
      location: form.location.trim(),
      address: form.address.trim(),
      weekday: Number(form.weekday),
      startTime,
      timezone: form.timezone || DEFAULT_GAME_TIMEZONE,
      type: form.type,
      target: Number(form.target) || 8,
      status: form.status,
    });
  };

  const preview = formatSchedulePreview({
    weekday: Number(form.weekday),
    startTime: fromTimeInputValue(form.startTime) ?? form.startTime,
    timezone: form.timezone,
  });

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
        <Field label="Location">
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
        <Field label="Day of week">
          <SelectField
            value={form.weekday}
            onChange={(weekday) => setField("weekday", Number(weekday))}
            options={WEEKDAY_OPTIONS}
            disabled={saving}
            aria-label="Day of week"
          />
        </Field>
        <Field label="Start time">
          <input
            className="field__input"
            type="time"
            value={toTimeInputValue(form.startTime)}
            onChange={(event) => setField("startTime", event.target.value)}
          />
        </Field>
      </div>

      <div className="field-grid">
        <Field label="Timezone">
          <SelectField
            value={form.timezone}
            onChange={(timezone) => setField("timezone", timezone)}
            options={GAME_TIMEZONE_OPTIONS}
            disabled={saving}
            aria-label="Timezone"
          />
        </Field>
        <Field label="Status">
          <SelectField
            value={form.status}
            onChange={(status) => setField("status", status)}
            options={GAME_STATUS_OPTIONS}
            disabled={saving}
            aria-label="Game status"
          />
        </Field>
      </div>

      {preview ? <p className="field__hint">{preview}</p> : null}

      <div className="field-grid">
        <Field label="Game type">
          <SelectField
            value={form.type}
            onChange={(type) => {
              setField("type", type);
              setField("target", type === "big" ? 14 : 8);
            }}
            options={GAME_TYPE_OPTIONS}
            disabled={saving}
            aria-label="Game type"
          />
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
