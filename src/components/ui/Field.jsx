export default function Field({ label, error, children, className = "" }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label && <label className="field__label">{label}</label>}
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
