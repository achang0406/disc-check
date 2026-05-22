import { useEffect, useRef, useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";
import PhoneField from "./PhoneField.jsx";
import { isValidPhone } from "../../utils/phone.js";

export default function SignUpModal({ saving, onSubmit, onClose, onLookupPhone }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [lookup, setLookup] = useState(null);
  const lookupRequestId = useRef(0);

  const recoveredProfile =
    lookup && typeof lookup === "object" && lookup.id ? lookup : null;

  useEffect(() => {
    if (!onLookupPhone) return undefined;

    const trimmedPhone = phone.trim();
    if (!trimmedPhone || !isValidPhone(trimmedPhone)) {
      setLookup(null);
      return undefined;
    }

    const requestId = ++lookupRequestId.current;
    setLookup("loading");

    const timer = setTimeout(async () => {
      try {
        const existing = await onLookupPhone(trimmedPhone);
        if (requestId !== lookupRequestId.current) return;
        setLookup(existing ?? "not-found");
        if (existing?.name) {
          setName(existing.name);
        }
      } catch {
        if (requestId !== lookupRequestId.current) return;
        setLookup(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phone, onLookupPhone]);

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

    if (lookup === "loading") {
      setPhoneError("checking phone…");
      return;
    }

    setError("");
    setPhoneError("");
    onSubmit({ name: trimmedName, phone: phone.trim() || null });
  };

  let phoneHint = "Links your RSVPs across devices. Never shown to other players.";
  if (lookup === "loading") {
    phoneHint = "Checking for an existing profile…";
  } else if (recoveredProfile) {
    phoneHint = `Found your profile — we'll sign you in as ${recoveredProfile.name}.`;
  } else if (lookup === "not-found" && phone.trim() && isValidPhone(phone)) {
    phoneHint = "No profile on this number yet — we'll create one when you join.";
  }

  return (
    <ModalShell
      title="Join this game"
      description="We'll remember your name on this device. Add a phone to pick up RSVPs on another device."
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" block disabled={saving || lookup === "loading"} onClick={handleSubmit}>
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
          autoFocus={!recoveredProfile}
          readOnly={!!recoveredProfile}
          onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
        />
      </Field>

      <PhoneField
        value={phone}
        onChange={(value) => {
          setPhone(value);
          setPhoneError("");
          if (!value.trim()) {
            setLookup(null);
          }
        }}
        error={phoneError}
        hint={phoneHint}
      />
    </ModalShell>
  );
}
