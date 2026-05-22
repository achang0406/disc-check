export function getCommitPressureCopy({ count, target, rsvpd, checkedIn, isLive, cancelled }) {
  if (cancelled) return "Cancelled";
  if (count >= target) return "Game is a go!";
  if (isLive && checkedIn) return "You're here";
  if (!isLive && rsvpd) return "You're in";
  const need = target - count;
  return `Need ${need} more for a go`;
}
