import { useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";
import PhoneField from "./PhoneField.jsx";
import { isValidPhone } from "../../utils/phone.js";

export default function SignUpModal({ saving, onSubmit, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("enter your name");
      return;
    }

    if (phone.trim() && !isValidPhone(phone)) {
      setPhoneError("enter a valid phone number");
      return;
    }

    setError("");
    setPhoneError("");
    onSubmit({ name: trimmedName, phone: phone.trim() || null });
  };

  return (
    <ModalShell
      title="Join this game"
      description="We'll remember your name on this device. Add a phone to pick up RSVPs on another device."
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" block disabled={saving} onClick={handleSubmit}>
            {saving ? "saving..." : "Count me in"}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Name" error={error}>
        <input
          className="field__input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          placeholder="e.g. Alex Rivera"
          autoFocus
          onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
        />
      </Field>

      <PhoneField
        value={phone}
        onChange={(value) => {
          setPhone(value);
          setPhoneError("");
        }}
        error={phoneError}
      />
    </ModalShell>
  );
}
