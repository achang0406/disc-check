import { useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import { displayPlayerName, formatChipExtras, formatKitSuffix } from "../../utils/format.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function WalkInAddForm({
  disabled,
  placeholder,
  onAdd,
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
    <Field error={error}>
      <div className="game-walk-ins__row">
        <input
          className="field__input game-walk-ins__input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Walk-in name"
          onKeyDown={(event) => event.key === "Enter" && handleAdd()}
        />
        <Button variant="secondary" disabled={disabled} onClick={handleAdd}>
          Add
        </Button>
      </div>
    </Field>
  );
}

export default function WhoIsHereSection({
  label,
  showLabel = false,
  checkInEntries = [],
  walkInEntries = [],
  profileId,
  disabled = false,
  showWalkInInput = false,
  allowWalkInRemove = true,
  inputPlaceholder = "Walk-in name",
  onAddWalkIn,
  onRemoveWalkIn,
}) {
  const hasCheckIns = checkInEntries.length > 0;
  const hasWalkIns = walkInEntries.length > 0;
  const hasPeople = hasCheckIns || hasWalkIns;

  return (
    <div
      className="live-pickup__here"
      aria-label={!showLabel && label ? label : undefined}
    >
      {showLabel && label && <p className="game-detail-players__label">{label}</p>}

      {hasPeople && (
        <div className="chip-list live-pickup__here-list">
          {checkInEntries.map((entry) => {
            const isYou = entry.userId === profileId;
            const name = displayPlayerName(entry, profileId);
            const kitSuffix = formatKitSuffix(entry);
            const extras = formatChipExtras(entry);

            return (
              <span
                key={entry.userId}
                className={cx("chip", isYou && "chip--you")}
                title={
                  entry.plusOnes > 0
                    ? `${name} + ${entry.plusOnes} guest${entry.plusOnes !== 1 ? "s" : ""}${kitSuffix}`
                    : `${name}${kitSuffix}`
                }
              >
                {name}
                {extras && <span className="chip__muted">{extras}</span>}
              </span>
            );
          })}

          {walkInEntries.map((entry) => (
            <span key={entry.id} className="walk-in-chip">
              <span className={cx("chip", "chip--walk-in")}>{entry.name}</span>
              {allowWalkInRemove && !disabled && (
                <button
                  type="button"
                  className="walk-in-chip__remove"
                  aria-label={`Remove ${entry.name}`}
                  onMouseDown={suppressMouseFocus}
                  onClick={() => onRemoveWalkIn?.(entry.id)}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {showWalkInInput && (
        <WalkInAddForm
          disabled={disabled}
          placeholder={inputPlaceholder}
          onAdd={onAddWalkIn}
        />
      )}
    </div>
  );
}
