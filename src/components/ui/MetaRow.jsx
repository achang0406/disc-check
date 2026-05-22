import LocationDisplay from "../games/LocationDisplay.jsx";
import { formatGameLocation } from "../../utils/location.js";
import { formatGameTime } from "../../utils/time.js";

/** Location and game time on one line. */
export default function MetaRow({ game, className = "" }) {
  const { display, tooltip } = formatGameLocation(game);

  return (
    <p className={`meta-row meta-row--location ${className}`.trim()}>
      <span className="meta-row__text">
        <LocationDisplay display={display} tooltip={tooltip} />
        <span className="meta-row__time"> · {formatGameTime(game)}</span>
      </span>
    </p>
  );
}
