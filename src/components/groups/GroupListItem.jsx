import { Link } from "react-router-dom";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";
import { clearBackToLanding } from "../../utils/landingNavigation.js";

import { WELCOME_TARGETS } from "../../constants/welcome.js";

export default function GroupListItem({ group, summary, walkthroughTarget }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="game-list-item surface group-list-item"
      {...(walkthroughTarget ? { "data-walkthrough-target": walkthroughTarget } : {})}
      onMouseDown={suppressMouseFocus}
      onClick={clearBackToLanding}
    >
      <div className="game-list-item__top">
        <h2 className="game-list-item__title">{group.name}</h2>
        <span className="game-list-item__cta" aria-hidden="true">
          →
        </span>
      </div>
      {group.description ? (
        <p className="group-list-item__description">{group.description}</p>
      ) : null}
      {summary ? <p className="group-list-item__summary">{summary}</p> : null}
    </Link>
  );
}
