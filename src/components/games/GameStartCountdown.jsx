import { useGameClock } from "../../hooks/useGameClock.js";
import { getCountdownToStartMs } from "../../utils/gameSchedule.js";

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function GameStartCountdown({ game, className = "", now: nowProp }) {
  const tickNow = useGameClock(250);
  const now = nowProp ?? tickNow;
  const remainingMs = getCountdownToStartMs(game, now);

  if (remainingMs == null) return null;

  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const label = formatCountdown(seconds);

  return (
    <span
      className={["game-start-countdown", className].filter(Boolean).join(" ")}
      role="timer"
      aria-live="polite"
      aria-label={`Game starts in ${seconds} seconds`}
    >
      Starts in {label}
    </span>
  );
}
