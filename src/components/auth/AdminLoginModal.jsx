import { useState } from "react";
import Button from "../ui/Button.jsx";
import AdminPasscodeInput from "../ui/AdminPasscodeInput.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";
import { isValidAdminPasscode } from "../../utils/adminPasscode.js";

export default function AdminLoginModal({
  saving,
  onSubmit,
  onClose,
  title = "Admin access",
  description = "Enter the 4-digit passcode to manage games",
}) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!isValidAdminPasscode(passcode)) {
      setError("Enter a 4-digit passcode");
      return;
    }
    setError("");
    const ok = await onSubmit(passcode);
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
          <Button
            variant="primary"
            block
            disabled={saving || !isValidAdminPasscode(passcode)}
            onClick={handleSubmit}
          >
            Unlock admin
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Passcode" error={error}>
        <AdminPasscodeInput
          value={passcode}
          onChange={(next) => {
            setPasscode(next);
            setError("");
          }}
          autoFocus
          disabled={saving}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !isValidAdminPasscode(passcode)) return;
            event.preventDefault();
            void handleSubmit();
          }}
        />
      </Field>
    </ModalShell>
  );
}
