/** Normalize to digits; default US numbers get a leading 1. Returns null when empty. */
export function normalizePhone(value) {
  if (value == null || !String(value).trim()) return null;

  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

/** US display for stored normalized numbers; otherwise digits as entered. */
export function formatPhoneDisplay(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return "";

  if (normalized.length === 11 && normalized.startsWith("1")) {
    const area = normalized.slice(1, 4);
    const mid = normalized.slice(4, 7);
    const last = normalized.slice(7);
    return `(${area}) ${mid}-${last}`;
  }

  return normalized;
}

export function isValidPhone(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return true;
  return normalized.length >= 10 && normalized.length <= 15;
}
