function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function ModalShell({
  title,
  description,
  children,
  footer,
  stackFooter = false,
  wide = false,
  onClose,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={cx("modal", "surface", wide && "modal--wide")}
        onClick={(event) => event.stopPropagation()}
      >
        {title && <h2 className="modal__title">{title}</h2>}
        {description && <div className="modal__description">{description}</div>}
        {children && <div className="modal__body">{children}</div>}
        {footer && (
          <div className={cx("modal__footer", stackFooter && "modal__footer--stack")}>{footer}</div>
        )}
      </div>
    </div>
  );
}
