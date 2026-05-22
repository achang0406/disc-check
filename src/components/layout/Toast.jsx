export default function Toast({ toast }) {
  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div className={`toast ${isError ? "toast--error" : "toast--success"}`} role="status">
      {toast.msg}
    </div>
  );
}
