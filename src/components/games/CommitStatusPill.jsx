export default function CommitStatusPill({
  isLive,
  rsvpd,
  checkedIn,
  cancelled,
  reserveSpace = false,
}) {
  const committed = !cancelled && (rsvpd || checkedIn);
  const label = isLive && checkedIn ? "Here" : "In";

  if (!reserveSpace && !committed) {
    return null;
  }

  return (
    <span
      className={`commit-status-pill${committed ? "" : " commit-status-pill--hidden"}`}
      aria-hidden={!committed}
    >
      {label}
    </span>
  );
}
