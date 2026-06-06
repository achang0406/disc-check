export function getGameBadgeVariant({ count, target, cancelled }) {
  if (cancelled) return "cancelled";
  if (count >= target) return "go";
  if (count >= Math.max(1, target - 2)) return "almost";
  return "not";
}
