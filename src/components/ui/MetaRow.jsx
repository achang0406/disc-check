import LocationDisplay from "../games/LocationDisplay.jsx";
import { getGameTypeLabel } from "../../utils/gameType.js";
import { formatGameLocation } from "../../utils/location.js";
import {
  TIME_PERIOD_ICONS,
  TIME_PERIOD_TEXT,
  formatGameTime,
  getTimePeriod,
} from "../../utils/time.js";

/** Location and game time on one line. */
export default function MetaRow({ game, className = "", allowAddressCopy = false, onAddressCopy }) {
  const { display, copyText } = formatGameLocation(game);
  const period = getTimePeriod(game);

  return (
    <p className={`meta-row meta-row--location ${className}`.trim()}>
      <span className="meta-row__text">
        <span className="meta-row__part meta-row__location">
          <LocationDisplay
            display={display}
            copyText={copyText}
            copyEnabled={allowAddressCopy}
            onCopy={allowAddressCopy ? onAddressCopy : undefined}
          />
        </span>
        <span className="meta-row__part meta-row__type">{getGameTypeLabel(game.type)}</span>
        <span className="meta-row__part meta-row__time">{formatGameTime(game)}</span>
        {period ? (
          <span className="meta-row__part meta-row__slot" title={TIME_PERIOD_TEXT[period]}>
            <span className="meta-row__period-icon" aria-hidden="true">
              {TIME_PERIOD_ICONS[period]}
            </span>
            <span className="meta-row__period-text">{TIME_PERIOD_TEXT[period]}</span>
          </span>
        ) : null}
      </span>
    </p>
  );
}
