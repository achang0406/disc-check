import Field from "../ui/Field.jsx";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

const DEFAULT_HINT = "Links your RSVPs across devices. Never shown to other players.";

export default function PhoneField({
  value,
  onChange,
  error = "",
  hint = DEFAULT_HINT,
  onRemove,
  removeDisabled = false,
}) {
  const showClear = Boolean(onRemove && value.trim());

  return (
    <Field
      label="Phone (optional)"
      error={error}
      hint={hint}
    >
      <div className={`phone-field${showClear ? " phone-field--clearable" : ""}`}>
        <input
          className="field__input phone-field__input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="(555) 555-5555"
        />
        {showClear && (
          <button
            type="button"
            className="phone-field__clear"
            aria-label="Remove phone number"
            disabled={removeDisabled}
            onMouseDown={suppressMouseFocus}
            onClick={onRemove}
          >
            ×
          </button>
        )}
      </div>
    </Field>
  );
}
