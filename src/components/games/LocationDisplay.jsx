export default function LocationDisplay({ display, tooltip, className }) {
  if (!tooltip) {
    return <span className={className}>{display}</span>;
  }

  return (
    <span className={`location-display${className ? ` ${className}` : ""}`}>
      <span className="location-display__label">{display}</span>
      <span className="location-display__tooltip" role="tooltip">
        {tooltip}
      </span>
    </span>
  );
}
