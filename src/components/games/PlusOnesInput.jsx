export default function PlusOnesInput({
  value,
  onChange,
  disabled = false,
  label = "guests",
  max = 10,
}) {
  const count = Number(value) || 0;

  return (
    <div
      className={`plus-ones${disabled ? " plus-ones--disabled" : ""}`}
      aria-label={`Plus ones: ${count}`}
    >
      <button
        type="button"
        className="plus-ones__btn"
        onClick={() => onChange(Math.max(0, count - 1))}
        disabled={disabled || count <= 0}
        aria-label={`Remove ${label}`}
      >
        −
      </button>
      <span className="plus-ones__readout" aria-live="polite">
        {count > 0 ? (
          <>
            +{count} <span className="plus-ones__label">{label}</span>
          </>
        ) : (
          <span className="plus-ones__label">+{label}</span>
        )}
      </span>
      <button
        type="button"
        className="plus-ones__btn"
        onClick={() => onChange(Math.min(max, count + 1))}
        disabled={disabled}
        aria-label={`Add ${label}`}
      >
        +
      </button>
    </div>
  );
}
