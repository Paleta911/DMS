import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Input({
  label,
  error,
  hint,
  className,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1 text-sm text-brand-textMuted transition-shadow focus-within:shadow-soft">
      {label ? (
        <label htmlFor={inputId} className="text-xs uppercase tracking-widest">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={ariaInvalid ?? Boolean(error)}
        aria-describedby={describedBy}
        className={[
          'w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-brand-text shadow-sm outline-none transition focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-accent/20',
          error ? 'border-ember/70' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error ? (
        <span id={errorId} className="text-xs text-ember">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-xs text-brand-textMuted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
