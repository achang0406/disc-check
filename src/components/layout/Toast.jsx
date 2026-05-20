export default function Toast({ toast }) {
  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: isError ? "#3d1a1a" : "#0d4f2e",
        border: `1px solid ${isError ? "#ef4444" : "#22c55e"}`,
        color: isError ? "#f87171" : "#4ade80",
        padding: "10px 20px",
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "'DM Mono',monospace",
        zIndex: 100,
      }}
    >
      {toast.msg}
    </div>
  );
}
