function KitIcon() {
  return (
    <svg className="bringing-kit__icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 3.5v17M7.5 12h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export default function BringingKitToggle({
  value,
  onChange,
  disabled = false,
  label = "Bringing kit",
}) {
  return (
    <button
      type="button"
      className={`bringing-kit${value ? " bringing-kit--on" : ""}${disabled ? " bringing-kit--disabled" : ""}`}
      aria-pressed={value}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        onChange(!value);
        event.currentTarget.blur();
      }}
    >
      <KitIcon />
      <span className="bringing-kit__label">{label}</span>
    </button>
  );
}
