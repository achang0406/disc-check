import { useState } from "react";
import Button from "../ui/Button.jsx";
import AdminPasscodeInput from "../ui/AdminPasscodeInput.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";
import { isValidAdminPasscode } from "../../utils/adminPasscode.js";

const EMPTY_FORM = {
  name: "",
  description: "",
  adminPasscode: "",
};

export default function CreateGroupModal({ saving, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("Group name is required");
      return;
    }

    if (!isValidAdminPasscode(form.adminPasscode)) {
      setError("Enter a 4-digit group admin passcode");
      return;
    }

    setError("");
    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      adminPasscode: form.adminPasscode,
    });
  };

  return (
    <ModalShell
      title="Add group"
      description="Create a new pickup group for players to browse"
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" block disabled={saving} onClick={handleSubmit}>
            {saving ? "Creating…" : "Create group"}
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
          placeholder="Kirkland Goaltimate"
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
          placeholder="Optional — shown on the group page"
          onChange={(event) => setField("description", event.target.value)}
        />
      </Field>
      <Field
        label="Group admin passcode"
        hint="4-digit code for managing games in this group"
        error={
          error && form.name.trim() && !isValidAdminPasscode(form.adminPasscode) ? error : undefined
        }
      >
        <AdminPasscodeInput
          value={form.adminPasscode}
          onChange={(next) => {
            setField("adminPasscode", next);
            setError("");
          }}
          disabled={saving}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (!form.name.trim() || !isValidAdminPasscode(form.adminPasscode)) return;
            event.preventDefault();
            void handleSubmit();
          }}
        />
      </Field>
      {error && form.name.trim() && isValidAdminPasscode(form.adminPasscode) ? (
        <p className="field__error">{error}</p>
      ) : null}
    </ModalShell>
  );
}
