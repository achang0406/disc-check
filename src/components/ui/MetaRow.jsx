import LocationDisplay from "../games/LocationDisplay.jsx";
import { formatGameLocation } from "../../utils/location.js";
import { TIME_PERIOD_LABELS, formatGameTime, getTimePeriod } from "../../utils/time.js";

/** Location and game time on one line. */
export default function MetaRow({ game, className = "", allowAddressCopy = false, onAddressCopy }) {
  const { display, copyText } = formatGameLocation(game);
  const period = getTimePeriod(game);
  const periodLabel = period ? TIME_PERIOD_LABELS[period] : null;

  return (
    <p className={`meta-row meta-row--location ${className}`.trim()}>
      <span className="meta-row__text">
        <LocationDisplay
          display={display}
          copyText={copyText}
          copyEnabled={allowAddressCopy}
          onCopy={allowAddressCopy ? onAddressCopy : undefined}
        />
        <span className="meta-row__time"> · {formatGameTime(game)}</span>
        {periodLabel && <span className="meta-row__slot"> · {periodLabel}</span>}
      </span>
    </p>
  );
}
