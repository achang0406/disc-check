import Field from "../ui/Field.jsx";

export default function PhoneField({ value, onChange, error = "" }) {
  return (
    <Field
      label="Phone (optional)"
      error={error}
      hint="Links your RSVPs across devices. Never shown to other players."
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
