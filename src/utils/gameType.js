export function formatGameType(type) {
  if (type === "big") return "🔴 big";
  if (type === "goaltimate" || type === "small") return "🟡 goaltimate";
  return type;
}

export function isGoaltimateType(type) {
  return type === "goaltimate" || type === "small";
}
