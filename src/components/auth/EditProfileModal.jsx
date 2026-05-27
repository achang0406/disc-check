import { useEffect, useRef, useState } from "react";
import { colorForId } from "../../constants/presence.js";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import ModalShell from "../ui/ModalShell.jsx";
import ColorWheel, { HexColorInput } from "./ColorWheel.jsx";
import PhoneField from "./PhoneField.jsx";
import { formatPhoneDisplay, isValidPhone, normalizePhone } from "../../utils/phone.js";

export default function EditProfileModal({
  profile,
  saving,
  onSubmit,
  onClose,
  onValidatePhone,
  onLookupPhone,
  onRecoverProfile,
}) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(formatPhoneDisplay(profile.phone));
  const [bubbleColor, setBubbleColor] = useState(profile.bubbleColor || colorForId(profile.id));
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [lookup, setLookup] = useState(null);
  const lookupRequestId = useRef(0);

  const hadPhone = Boolean(profile.phone);
  const clearingPhone = hadPhone && !phone.trim();
  const normalizedCurrent = normalizePhone(profile.phone);
  const normalizedNew = normalizePhone(phone);

  const linkedProfile =
    lookup && typeof lookup === "object" && lookup.id && lookup.id !== profile.id ? lookup : null;

  useEffect(() => {
    if (!onLookupPhone) return undefined;

    const trimmedPhone = phone.trim();
    if (!trimmedPhone || !isValidPhone(trimmedPhone)) {
      setLookup(null);
      return undefined;
    }

    if (normalizedNew && normalizedNew === normalizedCurrent) {
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
      } catch {
        if (requestId !== lookupRequestId.current) return;
        setLookup(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phone, normalizedCurrent, normalizedNew, onLookupPhone]);

  let phoneHint = "Links your RSVPs across devices. Never shown to other players.";
  if (clearingPhone) {
    phoneHint = "Your phone will be unlinked when you save. RSVPs on this device stay as-is.";
  } else if (lookup === "loading") {
    phoneHint = "Checking for an existing profile…";
  } else if (linkedProfile) {
    phoneHint = `This number is linked to ${linkedProfile.name}. Switch to that profile to use it here.`;
  } else if (lookup === "not-found" && phone.trim() && isValidPhone(phone)) {
    phoneHint = "No profile on this number yet — we'll link it when you save.";
  }

  const handleSubmit = async () => {
    if (linkedProfile) {
      setPhoneError("Switch to the existing profile to use this number");
      return;
    }

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

    if (normalizedNew && normalizedNew !== normalizedCurrent && onValidatePhone) {
      setCheckingPhone(true);
      try {
        const available = await onValidatePhone(phone, profile.id);
        if (!available) {
          setPhoneError("That phone is linked to another profile");
          return;
        }
      } catch {
        setPhoneError("Couldn't verify phone — try again");
        return;
      } finally {
        setCheckingPhone(false);
      }
    }

    setError("");
    setPhoneError("");
    onSubmit({
      name: trimmedName,
      bubbleColor,
      phone: phone.trim() || null,
    });
  };

  const handleRecover = () => {
    if (!linkedProfile || saving) return;
    onRecoverProfile?.(linkedProfile);
  };

  const busy = saving || checkingPhone || lookup === "loading";

  return (
    <ModalShell
      title="Edit profile"
      onClose={onClose}
      footer={
        linkedProfile ? (
          <>
            <Button variant="primary" block disabled={busy} onClick={handleRecover}>
              {saving ? "switching..." : `Switch to ${linkedProfile.name}`}
            </Button>
            <Button variant="secondary" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" block disabled={busy} onClick={handleSubmit}>
              {checkingPhone || lookup === "loading" ? "checking phone…" : saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
          </>
        )
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
          onKeyDown={(event) => event.key === "Enter" && !linkedProfile && handleSubmit()}
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
        onRemove={() => {
          setPhone("");
          setLookup(null);
        }}
        removeDisabled={busy}
      />

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
          Who&apos;s got disc?
        </div>
      </Field>
    </ModalShell>
  );
}
