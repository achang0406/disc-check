import { TIME_LABELS, formatGameTime, getTimeSlot } from "../../utils/time.js";
import { formatGameType } from "../../utils/gameType.js";

/** Schedule line only — pair with location row or use GameCard header layout. */
export default function MetaRow({ game, scheduleClassName = "game-card__detail" }) {
  const slot = getTimeSlot(game.startsAt);

  return (
    <p className={`meta-row meta-row--schedule ${scheduleClassName}`.trim()}>
      <span className="meta-row__time game-card__detail-time">{formatGameTime(game.startsAt)}</span>
      <span className="meta-row__slot game-card__detail-slot"> · {TIME_LABELS[slot]}</span>
      <span className="meta-row__type game-card__detail-type"> · {formatGameType(game.type)}</span>
    </p>
  );
}
