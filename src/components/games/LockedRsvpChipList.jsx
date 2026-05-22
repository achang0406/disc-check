import { useEffect, useRef, useState } from "react";
import Button from "../ui/Button.jsx";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function LockedRsvpChipList({
  entries,
  profileId,
  checkedInUserIds,
  emptyLabel,
  disabled = false,
  onSetBailed,
  className = "",
}) {
  const [activeId, setActiveId] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!activeId) return undefined;

    const onPointerDown = (event) => {
      if (listRef.current?.contains(event.target)) return;
      setActiveId(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeId]);

  if (entries.length === 0) {
    return <p className="chip-list__empty">{emptyLabel}</p>;
  }

  const checkedIn = checkedInUserIds ?? new Set();

  return (
    <div className={cx("chip-list", "chip-list--locked-rsvp", className)} ref={listRef}>
      {entries.map((entry) => {
        const isYou = entry.userId === profileId;
        const isHere = checkedIn.has(entry.userId);
        const isActive = activeId === entry.userId;
        const label =
          entry.plusOnes > 0
            ? `${entry.name} + ${entry.plusOnes} guest${entry.plusOnes !== 1 ? "s" : ""}`
            : entry.name;

        return (
          <span key={entry.userId} className="chip-anchor">
            <button
              type="button"
              className={cx(
                "chip",
                "chip--interactive",
                isYou && "chip--you",
                entry.bailed && "chip--bailed",
                isActive && "chip--active",
              )}
              title={label}
              disabled={disabled}
              aria-expanded={isActive}
              onClick={() => setActiveId(isActive ? null : entry.userId)}
            >
              {entry.name}
              {entry.plusOnes > 0 && <span className="chip__muted"> +{entry.plusOnes}</span>}
            </button>

            {isActive && (
              <div className="chip-popover" role="dialog" aria-label={`${entry.name} RSVP status`}>
                {isHere ? (
                  <p className="chip-popover__note">{entry.name} is checked in</p>
                ) : entry.bailed ? (
                  <>
                    <p className="chip-popover__note">Marked as bailed</p>
                    <Button
                      variant="secondary"
                      disabled={disabled}
                      onClick={() => {
                        onSetBailed?.(entry, false);
                        setActiveId(null);
                      }}
                    >
                      Unbail
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="chip-popover__note">Didn&apos;t show up?</p>
                    <Button
                      variant="secondary"
                      disabled={disabled}
                      onClick={() => {
                        onSetBailed?.(entry, true);
                        setActiveId(null);
                      }}
                    >
                      Mark as bailed
                    </Button>
                  </>
                )}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
