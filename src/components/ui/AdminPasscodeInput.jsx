import { useCallback, useEffect, useRef } from "react";
import {
  ADMIN_PASSCODE_LENGTH,
  sanitizeAdminPasscodeInput,
} from "../../utils/adminPasscode.js";

function digitsFromValue(value) {
  const sanitized = sanitizeAdminPasscodeInput(value);
  return Array.from({ length: ADMIN_PASSCODE_LENGTH }, (_, index) => sanitized[index] ?? "");
}

export default function AdminPasscodeInput({
  value,
  onChange,
  autoFocus = false,
  autoComplete = "off",
  className = "",
  disabled = false,
  onKeyDown,
}) {
  const inputRefs = useRef([]);
  const digits = digitsFromValue(value);

  const focusIndex = useCallback((index) => {
    const node = inputRefs.current[index];
    if (!node) return;
    node.focus();
    node.select();
  }, []);

  const setPasscode = useCallback(
    (next) => {
      onChange(sanitizeAdminPasscodeInput(next));
    },
    [onChange],
  );

  const applyDigits = useCallback(
    (nextDigits, focusAt) => {
      setPasscode(nextDigits.join(""));
      if (focusAt != null) {
        requestAnimationFrame(() => focusIndex(focusAt));
      }
    },
    [focusIndex, setPasscode],
  );

  useEffect(() => {
    if (autoFocus && !disabled) {
      focusIndex(0);
    }
  }, [autoFocus, disabled, focusIndex]);

  const handleDigitChange = (index, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const nextDigits = [...digits];
    nextDigits[index] = digit;
    const nextFocus = index < ADMIN_PASSCODE_LENGTH - 1 ? index + 1 : index;
    applyDigits(nextDigits, nextFocus);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const nextDigits = [...digits];

      if (nextDigits[index]) {
        nextDigits[index] = "";
        applyDigits(nextDigits, index);
        return;
      }

      if (index > 0) {
        nextDigits[index - 1] = "";
        applyDigits(nextDigits, index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < ADMIN_PASSCODE_LENGTH - 1) {
      event.preventDefault();
      focusIndex(index + 1);
    }

    onKeyDown?.(event);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = sanitizeAdminPasscodeInput(event.clipboardData.getData("text"));
    if (!pasted) return;

    const nextDigits = digitsFromValue(pasted);
    const focusAt = Math.min(pasted.length, ADMIN_PASSCODE_LENGTH - 1);
    applyDigits(nextDigits, focusAt);
  };

  return (
    <div
      className={`passcode-input ${className}`.trim()}
      role="group"
      aria-label="4-digit admin passcode"
      onPaste={handlePaste}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          className="passcode-input__digit"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? autoComplete : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${ADMIN_PASSCODE_LENGTH}`}
          onChange={(event) => handleDigitChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.currentTarget.select()}
        />
      ))}
    </div>
  );
}
