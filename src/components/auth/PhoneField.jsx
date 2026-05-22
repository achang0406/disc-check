import Field from "../ui/Field.jsx";

const DEFAULT_HINT = "Links your RSVPs across devices. Never shown to other players.";

export default function PhoneField({ value, onChange, error = "", hint = DEFAULT_HINT }) {
  return (
    <Field
      label="Phone (optional)"
      error={error}
      hint={hint}
    >
      <input
        className="field__input"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="(555) 555-5555"
      />
    </Field>
  );
}
