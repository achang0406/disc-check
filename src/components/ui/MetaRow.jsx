import LocationDisplay from "../games/LocationDisplay.jsx";
import { formatGameLocation } from "../../utils/location.js";
import { formatGameTime } from "../../utils/time.js";

/** Location and game time on one line. */
export default function MetaRow({ game, className = "", allowAddressCopy = false, onAddressCopy }) {
  const { display, tooltip, copyText } = formatGameLocation(game);

  return (
    <p className={`meta-row meta-row--location ${className}`.trim()}>
      <span className="meta-row__text">
        <LocationDisplay
          display={display}
          tooltip={tooltip}
          copyText={copyText}
          copyEnabled={allowAddressCopy}
          onCopy={allowAddressCopy ? onAddressCopy : undefined}
        />
        <span className="meta-row__time"> · {formatGameTime(game)}</span>
      </span>
    </p>
  );
}
