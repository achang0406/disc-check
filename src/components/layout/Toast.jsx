export default function Toast({ toast, exiting = false, onDismiss }) {
  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div
      className={`toast ${isError ? "toast--error" : "toast--success"}${
        exiting ? " toast--exit" : ""
      }`}
      role="status"
      onClick={onDismiss}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onDismiss?.();
        }
      }}
      tabIndex={0}
    >
      {toast.msg}
    </div>
  );
}
