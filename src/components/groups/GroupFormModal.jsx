import { useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";

function buildForm(initial) {
  return {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    adminPasscode: "",
    adminPasscodeConfirm: "",
  };
}

export default function GroupFormModal({ group, saving, onSave, onClose }) {
  const [form, setForm] = useState(() => buildForm(group));
  const [error, setError] = useState("");

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("Group name is required");
      return;
    }

    if (form.adminPasscode || form.adminPasscodeConfirm) {
      if (form.adminPasscode !== form.adminPasscodeConfirm) {
        setError("Passcodes do not match");
        return;
      }
    }

    setError("");
    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      adminPasscode: form.adminPasscode.trim() || undefined,
    });
  };

  return (
    <ModalShell
      title="Edit group"
      description="Update group details for everyone in this pickup"
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" block disabled={saving} onClick={handleSubmit}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Group name" error={error && !form.name.trim() ? error : undefined}>
        <input
          className="field__input"
          value={form.name}
          onChange={(event) => {
            setField("name", event.target.value);
            setError("");
          }}
        />
      </Field>
      <Field label="Description">
        <textarea
          className="field__input field__input--textarea"
          value={form.description}
          rows={3}
          onChange={(event) => setField("description", event.target.value)}
        />
      </Field>
      <Field label="New admin passcode" hint="Leave blank to keep the current passcode">
        <input
          className="field__input"
          type="password"
          value={form.adminPasscode}
          onChange={(event) => setField("adminPasscode", event.target.value)}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirm passcode">
        <input
          className="field__input"
          type="password"
          value={form.adminPasscodeConfirm}
          onChange={(event) => setField("adminPasscodeConfirm", event.target.value)}
          autoComplete="new-password"
        />
      </Field>
      {error && form.name.trim() ? <p className="field__error">{error}</p> : null}
    </ModalShell>
  );
}
