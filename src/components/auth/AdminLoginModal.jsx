import { useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";

export default function AdminLoginModal({
  saving,
  onSubmit,
  onClose,
  title = "Admin access",
  description = "Enter the passcode to manage games",
}) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!passcode.trim()) {
      setError("Enter the admin passcode");
      return;
    }
    setError("");
    const ok = await onSubmit(passcode.trim());
    if (!ok) {
      setError("Incorrect passcode");
    }
  };

  return (
    <ModalShell
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" block disabled={saving} onClick={handleSubmit}>
            Unlock admin
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Passcode" error={error}>
        <input
          className="field__input"
          type="password"
          value={passcode}
          onChange={(event) => {
            setPasscode(event.target.value);
            setError("");
          }}
          autoFocus
          onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
        />
      </Field>
    </ModalShell>
  );
}
