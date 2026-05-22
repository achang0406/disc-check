export default function Field({ label, hint, error, children, className = "" }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label && <label className="field__label">{label}</label>}
      {children}
      {hint && !error ? <p className="field__hint">{hint}</p> : null}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
