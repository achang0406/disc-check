import { Link } from "react-router-dom";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

export default function GroupListItem({ group, summary }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="game-list-item surface group-list-item"
      onMouseDown={suppressMouseFocus}
    >
      <div className="game-list-item__top">
        <h2 className="game-list-item__title">{group.name}</h2>
      </div>
      {group.description ? (
        <p className="group-list-item__description">{group.description}</p>
      ) : null}
      {summary ? <p className="group-list-item__summary">{summary}</p> : null}
      <div className="game-list-item__footer">
        <span className="game-list-item__cta">View games →</span>
      </div>
    </Link>
  );
}
