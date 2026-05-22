import { useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";

export default function SignUpModal({ saving, onSubmit, onClose }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("enter your name");
      return;
    }
    setError("");
    onSubmit({ name: trimmedName });
  };

  return (
    <ModalShell
      title="Join this game"
      description="enter your name — we'll remember it for next time"
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
    </ModalShell>
  );
}
