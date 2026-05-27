/** Parse city from a US-style address like "11100 NE 68th St, Kirkland, WA 98033". */
export function parseCityFromAddress(address) {
  const trimmed = address?.trim();
  if (!trimmed) return "";

  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length < 2) return "";

  const last = parts[parts.length - 1];
  if (/^[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?$/i.test(last)) {
    return parts[parts.length - 2] || "";
  }

  return "";
}

/** Display label when set, otherwise the address. */
export function formatGameLocation({ location, address }) {
  const label = location?.trim() || "";
  const fullAddress = address?.trim() || "";
  const city = parseCityFromAddress(fullAddress);
  const display = label || fullAddress || city || "";
  const copyText = fullAddress || undefined;

  return { display, copyText, city };
}
