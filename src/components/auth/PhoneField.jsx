import Field from "../ui/Field.jsx";
import Button from "../ui/Button.jsx";

const DEFAULT_HINT = "Links your RSVPs across devices. Never shown to other players.";

export default function PhoneField({
  value,
  onChange,
  error = "",
  hint = DEFAULT_HINT,
  onRemove,
  removeDisabled = false,
}) {
  const showRemove = Boolean(onRemove && value.trim());

  return (
    <Field
      label="Phone (optional)"
      error={error}
      hint={hint}
    >
      <div className="phone-field">
        <input
          className="field__input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="(555) 555-5555"
        />
        {showRemove && (
          <Button
            type="button"
            variant="ghost"
            className="phone-field__remove"
            disabled={removeDisabled}
            onClick={onRemove}
          >
            Remove phone
          </Button>
        )}
      </div>
    </Field>
  );
}
