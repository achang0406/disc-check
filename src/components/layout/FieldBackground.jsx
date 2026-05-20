export default function FieldBackground() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        opacity: "var(--grid-opacity)",
      }}
    >
      {[...Array(8)].map((_, index) => (
        <div
          key={`v-${index}`}
          style={{
            position: "absolute",
            left: `${index * 14}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: "var(--grid-line)",
          }}
        />
      ))}
      {[...Array(5)].map((_, index) => (
        <div
          key={`h-${index}`}
          style={{
            position: "absolute",
            top: `${index * 25}%`,
            left: 0,
            right: 0,
            height: 1,
            background: "var(--grid-line)",
          }}
        />
      ))}
    </div>
  );
}
