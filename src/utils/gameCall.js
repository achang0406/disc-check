import { getCommitPressureCopy } from "./commitCopy.js";

export function getCallVariant(count, target, cancelled) {
  if (cancelled) return "cancelled";
  if (count >= target) return "go";
  if (count >= Math.max(1, target - 2)) return "almost";
  return "not";
}

export function getCallHeadline({
  count,
  target,
  cancelled = false,
  isLive = false,
  isEnded = false,
  compact = false,
}) {
  const variant = getCallVariant(count, target, cancelled);

  if (cancelled) {
    return "This game is cancelled";
  }

  if (isLive && compact) {
    const status =
      variant === "go"
        ? "Game is on"
        : variant === "almost"
          ? "Almost enough here"
          : "Still short on players";
    return `${status} · ${count} here / ${target} to play`;
  }

  if (isEnded) {
    return variant === "go" ? "Enough players showed up" : "Short on numbers this week";
  }

  if (variant === "go") {
    return "This week's game is on";
  }

  if (variant === "almost") {
    const need = target - count;
    return need === 1 ? "Almost there — need 1 more" : `Almost there — need ${need} more`;
  }

  return "Not enough players yet";
}

export function getCallSubline({
  count,
  target,
  cancelled = false,
  isLive = false,
  isEnded = false,
  rsvpd = false,
  checkedIn = false,
  compact = false,
}) {
  if (cancelled || compact) {
    return null;
  }

  if (isEnded) {
    return `${count} attended · ${target} needed to run a game`;
  }

  if (isLive) {
    return getCommitPressureCopy({
      count,
      target,
      rsvpd,
      checkedIn,
      isLive: true,
      cancelled,
    });
  }

  const variant = getCallVariant(count, target, cancelled);

  if (variant === "go") {
    return `${count} signed up · ${target} needed to play`;
  }

  if (variant === "almost") {
    return `${count} of ${target} signed up · know someone who'd play?`;
  }

  return `${count} of ${target} signed up · ${target - count} more needed for a game`;
}
