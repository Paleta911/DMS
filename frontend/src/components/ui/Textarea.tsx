import { useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export function Textarea({
  label,
  error,
  className,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = error ? `${textareaId}-error` : undefined;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1 text-sm text-brand-textMuted transition-shadow focus-within:shadow-soft">
      {label ? (
        <label htmlFor={textareaId} className="text-xs uppercase tracking-widest">
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        aria-invalid={ariaInvalid ?? Boolean(error)}
        aria-describedby={describedBy}
        className={[
          'min-h-[90px] w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-brand-text shadow-sm outline-none transition focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-accent/20',
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
      ) : null}
    </div>
  );
}
