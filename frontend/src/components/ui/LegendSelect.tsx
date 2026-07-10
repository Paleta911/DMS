import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Custom select with optional color legend dot, outside-click handling, and keyboard close.
export type LegendSelectOption = {
  value: string;
  label: string;
  dotClassName?: string;
};

type LegendSelectProps = {
  label?: string;
  error?: string;
  value: string;
  options: LegendSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

function LegendDot({ className }: { className?: string }) {
  if (!className) {
    return <span className="h-3.5 w-3.5 rounded-full" aria-hidden="true" />;
  }

  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex h-3.5 w-3.5 rounded-full border border-white/10 shadow-[0_0_0_3px_rgba(15,23,42,0.12)]",
        className,
      ].join(" ")}
    />
  );
}

export function LegendSelect({
  label,
  error,
  value,
  options,
  onChange,
  disabled,
  className,
  id,
}: LegendSelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    // Dismiss dropdown when user clicks outside control.
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-1 text-sm text-brand-textMuted transition-shadow focus-within:shadow-soft"
    >
      {label ? (
        <label htmlFor={selectId} className="text-xs uppercase tracking-widest">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <button
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-describedby={errorId}
          className={[
            "flex w-full items-center gap-3 rounded-xl border border-brand-border bg-brand-surface px-4 py-2 text-left text-brand-text shadow-sm outline-none transition focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-accent/20 disabled:cursor-not-allowed disabled:opacity-60",
            error ? "border-ember/70" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="min-w-0 flex-1 truncate">
            {selectedOption?.label ?? ""}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <LegendDot className={selectedOption?.dotClassName} />
            <ChevronDown
              size={18}
              className={[
                "text-brand-textMuted transition-transform",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </div>
        </button>

        {open ? (
          <div
            role="listbox"
            aria-labelledby={selectId}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-brand-border bg-brand-surface p-1 shadow-soft"
          >
            <div className="flex max-h-72 flex-col overflow-y-auto">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value || "__empty__"}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-brand-text transition hover:bg-brand-bg",
                      isSelected ? "bg-brand-bg" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                    </span>
                    <LegendDot className={option.dotClassName} />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      {error ? (
        <span id={errorId} className="text-xs text-ember">
          {error}
        </span>
      ) : null}
    </div>
  );
}
