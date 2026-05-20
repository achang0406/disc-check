export const card = {
  background: "#111",
  border: "1px solid #1e1e1e",
  borderRadius: 14,
  padding: "16px 18px",
};

export const label = {
  fontSize: 11,
  color: "#555",
  fontFamily: "'DM Mono',monospace",
  display: "block",
  marginBottom: 5,
};

export const input = {
  background: "#0d0d0d",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#e8e8e8",
  fontSize: 13,
  fontFamily: "'DM Sans',sans-serif",
  width: "100%",
  outline: "none",
};

export function smallButton(bg, border, color) {
  return {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 6,
    color,
    fontSize: 11,
    padding: "4px 10px",
    cursor: "pointer",
    fontFamily: "'DM Mono',monospace",
    whiteSpace: "nowrap",
  };
}

export const globalStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  * { box-sizing: border-box; }
  input:focus, select:focus { border-color: #22c55e !important; outline: none; }
  ::placeholder { color: #333; }
`;
