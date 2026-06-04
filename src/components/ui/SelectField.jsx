import { useCallback, useEffect, useId, useRef, useState } from "react";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function formatSelectOptionLabel(option) {
  if (option.hint) return `${option.label} (${option.hint})`;
  return option.label;
}

function SelectOptionLabel({ option, responsive = false }) {
  const fullLabel = formatSelectOptionLabel(option);

  if (!responsive || !option.shortLabel) {
    return <span className="select-field__option-label">{fullLabel}</span>;
  }

  return (
    <span className="select-field__option-label select-field__option-label--responsive">
      <span className="select-field__label-full">{fullLabel}</span>
      <span className="select-field__label-short">{option.shortLabel}</span>
    </span>
  );
}

function Chevron() {
  return (
    <svg
      className="select-field__chevron"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SelectField({
  value,
  onChange,
  options,
  disabled = false,
  className = "",
  placeholder = "Select…",
  "aria-label": ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const rootRef = useRef(null);
  const listboxId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const close = useCallback(() => {
    setOpen(false);
    setHighlightIndex(-1);
  }, []);

  const selectOption = useCallback(
    (option) => {
      if (disabled) return;
      onChange(option.value);
      close();
    },
    [close, disabled, onChange],
  );

  useEffect(() => {
    if (!open) return undefined;

    const dismiss = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      close();
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (!rootRef.current?.contains(document.activeElement)) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((index) => {
          if (index < 0) return selectedIndex >= 0 ? selectedIndex : 0;
          return Math.min(options.length - 1, index + 1);
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((index) => {
          if (index < 0) return selectedIndex >= 0 ? selectedIndex : options.length - 1;
          return Math.max(0, index - 1);
        });
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        setHighlightIndex(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        setHighlightIndex(options.length - 1);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const index = highlightIndex >= 0 ? highlightIndex : selectedIndex;
        if (index >= 0) selectOption(options[index]);
      }
    };

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, highlightIndex, open, options, selectOption, selectedIndex]);

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  return (
    <div className={cx("select-field", className)} ref={rootRef}>
      <button
        type="button"
        className={cx("select-field__trigger", open && "select-field__trigger--open")}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onMouseDown={suppressMouseFocus}
        onClick={() => (open ? close() : openMenu())}
      >
        <span className={cx("select-field__value", !selected && "select-field__value--placeholder")}>
          {selected ? (
            <SelectOptionLabel option={selected} responsive />
          ) : (
            placeholder
          )}
        </span>
        <Chevron />
      </button>

      {open ? (
        <ul id={listboxId} className="select-field__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightIndex;

            return (
              <li key={String(option.value)} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cx(
                    "select-field__option",
                    isSelected && "select-field__option--selected",
                    isHighlighted && "select-field__option--highlighted",
                    option.tone && `select-field__option--${option.tone}`,
                  )}
                  onMouseDown={suppressMouseFocus}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  <SelectOptionLabel option={option} />
                  {isSelected ? (
                    <span className="select-field__check" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
