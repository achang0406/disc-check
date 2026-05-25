import { useGameClock } from "../../hooks/useGameClock.js";
import {
  getCountdownToStartMs,
  showsStartingSoonLabel,
} from "../../utils/gameSchedule.js";
import GameStartCountdown from "./GameStartCountdown.jsx";

export default function GameStartStatus({
  game,
  className = "",
  pillClassName = "game-start-status",
}) {
  const now = useGameClock(250);
  const countdownMs = getCountdownToStartMs(game, now);

  if (countdownMs != null) {
    return <GameStartCountdown game={game} className={className} now={now} />;
  }

  if (!showsStartingSoonLabel(game, now)) return null;

  return (
    <span className={[pillClassName, className].filter(Boolean).join(" ")}>
      starting soon
    </span>
  );
}
