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

function isOptionDisabled(option) {
  return Boolean(option?.disabled);
}

function firstEnabledIndex(options, start = 0) {
  for (let index = start; index < options.length; index += 1) {
    if (!isOptionDisabled(options[index])) return index;
  }
  return -1;
}

function lastEnabledIndex(options) {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!isOptionDisabled(options[index])) return index;
  }
  return -1;
}

function nextEnabledIndex(options, index, direction) {
  if (options.length === 0) return -1;

  let next = index;
  for (let step = 0; step < options.length; step += 1) {
    next = (next + direction + options.length) % options.length;
    if (!isOptionDisabled(options[next])) return next;
  }

  return -1;
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
      if (disabled || isOptionDisabled(option)) return;
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
          if (index < 0) {
            if (selectedIndex >= 0 && !isOptionDisabled(options[selectedIndex])) {
              return selectedIndex;
            }
            return firstEnabledIndex(options);
          }
          return nextEnabledIndex(options, index, 1);
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((index) => {
          if (index < 0) {
            if (selectedIndex >= 0 && !isOptionDisabled(options[selectedIndex])) {
              return selectedIndex;
            }
            return lastEnabledIndex(options);
          }
          return nextEnabledIndex(options, index, -1);
        });
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        setHighlightIndex(firstEnabledIndex(options));
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        setHighlightIndex(lastEnabledIndex(options));
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
    if (selectedIndex >= 0 && !isOptionDisabled(options[selectedIndex])) {
      setHighlightIndex(selectedIndex);
      return;
    }
    setHighlightIndex(firstEnabledIndex(options));
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
                  aria-disabled={isOptionDisabled(option) || undefined}
                  disabled={isOptionDisabled(option)}
                  className={cx(
                    "select-field__option",
                    isSelected && "select-field__option--selected",
                    isHighlighted && "select-field__option--highlighted",
                    isOptionDisabled(option) && "select-field__option--disabled",
                    option.tone && `select-field__option--${option.tone}`,
                  )}
                  onMouseDown={suppressMouseFocus}
                  onMouseEnter={() => {
                    if (!isOptionDisabled(option)) setHighlightIndex(index);
                  }}
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
