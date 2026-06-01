import StatusBadge from "./StatusBadge.jsx";
import {
  getCallHeadline,
  getCallSubline,
  getCallVariant,
} from "../../utils/gameCall.js";

export default function CallPanel({
  count,
  target,
  cancelled = false,
  isLive = false,
  isEnded = false,
  rsvpd = false,
  checkedIn = false,
  compact = false,
  showBadge = true,
  className = "",
}) {
  const variant = getCallVariant(count, target, cancelled);
  const headline = getCallHeadline({
    count,
    target,
    cancelled,
    isLive,
    isEnded,
    compact,
  });
  const subline = getCallSubline({
    count,
    target,
    cancelled,
    isLive,
    isEnded,
    rsvpd,
    checkedIn,
    compact,
  });

  const panelClass = [
    "call-panel",
    compact ? "call-panel--compact" : "",
    `call-panel--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={panelClass}>
      <div className="call-panel__main">
        <p className="call-panel__headline">{headline}</p>
        {subline ? <p className="call-panel__subline">{subline}</p> : null}
      </div>
      {showBadge && !compact ? (
        <StatusBadge count={count} target={target} cancelled={cancelled} />
      ) : null}
    </div>
  );
}
