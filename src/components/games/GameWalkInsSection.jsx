import { useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function GameWalkInsSection({
  entries = [],
  disabled = false,
  showInput = true,
  onAdd,
  onRemove,
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("enter a name");
      return;
    }
    setError("");
    onAdd?.(trimmed);
    setName("");
  };

  return (
    <div className="game-walk-ins">
      <p className="game-detail-players__label">Walk-ins (no app)</p>

      {entries.length > 0 && (
        <div className="chip-list game-walk-ins__list">
          {entries.map((entry) => (
            <span key={entry.id} className="walk-in-chip">
              <span className={cx("chip", "chip--walk-in")}>{entry.name}</span>
              {!disabled && (
                <button
                  type="button"
                  className="walk-in-chip__remove"
                  aria-label={`Remove ${entry.name}`}
                  onClick={() => onRemove?.(entry.id)}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {showInput && (
        <Field error={error}>
          <div className="game-walk-ins__row">
            <input
              className="field__input game-walk-ins__input"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder="e.g. Jamie"
              disabled={disabled}
              aria-label="Walk-in guest name"
              onKeyDown={(event) => event.key === "Enter" && handleAdd()}
            />
            <Button variant="secondary" disabled={disabled} onClick={handleAdd}>
              Add
            </Button>
          </div>
        </Field>
      )}
    </div>
  );
}
