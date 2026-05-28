export function getPortalTarget() {
  if (typeof document === "undefined") return null;
  return document.body;
}
