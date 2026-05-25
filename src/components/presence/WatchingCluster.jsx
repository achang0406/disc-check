import HoverTooltip from "../ui/HoverTooltip.jsx";
import { WATCHING_DOT_CAP } from "../../utils/presenceUsers.js";

export default function WatchingCluster({ watchers = [] }) {
  if (watchers.length === 0) return null;

  const visible = watchers.slice(0, WATCHING_DOT_CAP);
  const overflow = watchers.length - visible.length;
  const names = watchers.map((user) => user.name).join(", ");
  const label = watchers.length === 1 ? "1 watching" : `${watchers.length} watching`;

  return (
    <HoverTooltip
      text={names}
      className="watching-cluster"
      aria-label={`${label}: ${names}`}
    >
      <div className="watching-cluster__dots" aria-hidden="true">
        {visible.map((user) => (
          <span
            key={user.id}
            className="watching-cluster__dot"
            style={{ backgroundColor: user.color }}
          />
        ))}
        {overflow > 0 ? (
          <span className="watching-cluster__overflow">+{overflow}</span>
        ) : null}
      </div>
      <span className="watching-cluster__label">{label}</span>
    </HoverTooltip>
  );
}
