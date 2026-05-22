import { useGameClock } from "../../hooks/useGameClock.js";
import { getCountdownToStartMs } from "../../utils/gameSchedule.js";

function formatCountdown(seconds) {
  return `0:${String(seconds).padStart(2, "0")}`;
}

export default function GameStartCountdown({ game, className = "" }) {
  const now = useGameClock(250);
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
