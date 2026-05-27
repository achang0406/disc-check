export function getGameTypeLabel(type) {
  if (type === "big") return "Biggie";
  if (type === "goaltimate" || type === "small") return "Goaltimate";
  return type || "Goaltimate";
}

export function formatGameType(type) {
  return getGameTypeLabel(type);
}

export function isGoaltimateType(type) {
  return type === "goaltimate" || type === "small";
}
