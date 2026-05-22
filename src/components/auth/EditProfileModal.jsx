import { useState } from "react";
import { colorForId } from "../../constants/presence.js";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";
import ColorWheel, { HexColorInput } from "./ColorWheel.jsx";

export default function EditProfileModal({ profile, saving, onSubmit, onClose }) {
  const [name, setName] = useState(profile.name);
  const [bubbleColor, setBubbleColor] = useState(profile.bubbleColor || colorForId(profile.id));
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("enter your name");
      return;
    }
    setError("");
    onSubmit({ name: trimmedName, bubbleColor });
  };

  return (
    <ModalShell
      title="Edit profile"
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" block disabled={saving} onClick={handleSubmit}>
            {saving ? "saving..." : "Save"}
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

      <Field label="Speech bubble color">
        <ColorWheel color={bubbleColor} onChange={setBubbleColor} />
        <HexColorInput color={bubbleColor} onChange={setBubbleColor} />
        <div
          style={{
            marginTop: "var(--space-3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: bubbleColor,
            color: "#0a0a0a",
            fontSize: "var(--font-body)",
            fontFamily: "var(--font-sans)",
          }}
        >
          preview bubble
        </div>
      </Field>
    </ModalShell>
  );
}
