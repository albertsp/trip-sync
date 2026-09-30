import { useId } from "react";

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  label: string;
  name: string;
  options: ChipOption<T>[];
  /** "single" renders radios, "multiple" renders checkboxes. */
  mode: "single" | "multiple";
  selected: T[];
  onToggle: (value: T) => void;
  optionalHint?: string;
}

/** Selectable chips backed by real radios/checkboxes, so keyboard and screen readers work. */
export function ChipGroup<T extends string>({
  label,
  name,
  options,
  mode,
  selected,
  onToggle,
  optionalHint,
}: ChipGroupProps<T>) {
  const labelId = useId();
  const type = mode === "single" ? "radio" : "checkbox";

  return (
    <div className="field">
      <span id={labelId} className="field-label-text">
        {label}
        {optionalHint && (
          <span className="field-optional"> · {optionalHint}</span>
        )}
      </span>
      <div
        className="chip-group"
        role={mode === "single" ? "radiogroup" : "group"}
        aria-labelledby={labelId}
      >
        {options.map((option) => (
          <label key={option.value} className="chip-select">
            <input
              type={type}
              name={name}
              value={option.value}
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
