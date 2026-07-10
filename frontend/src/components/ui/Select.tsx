import { useId } from "react";
import type { SelectHTMLAttributes } from "react";

// Accessible select field with label and validation message wiring.
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export function Select({
  label,
  error,
  className,
  children,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1 text-sm text-brand-textMuted transition-shadow focus-within:shadow-soft">
      {label ? (
        <label htmlFor={selectId} className="text-xs uppercase tracking-widest">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        aria-invalid={ariaInvalid ?? Boolean(error)}
        aria-describedby={describedBy}
        className={[
          "w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-brand-text shadow-sm outline-none transition focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-accent/20",
          error ? "border-ember/70" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <span id={errorId} className="text-xs text-ember">
          {error}
        </span>
      ) : null}
    </div>
  );
}
