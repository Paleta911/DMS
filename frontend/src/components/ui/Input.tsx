import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

// Accessible input component with inline hint/warning/error and optional password visibility toggle.
export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  warning?: string;
  hint?: string;
};

export function Input({
  label,
  error,
  warning,
  hint,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  const generatedId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const warningId = warning ? `${inputId}-warning` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  // Compose aria-describedby chain so assistive tech reads hint/warning/error consistently.
  const describedBy =
    [ariaDescribedBy, hintId, warningId, errorId].filter(Boolean).join(" ") ||
    undefined;
  const isPasswordField = props.type === "password";
  const inputType = isPasswordField && showPassword ? "text" : props.type;

  return (
    <div className="flex flex-col gap-1 text-sm text-brand-textMuted transition-shadow focus-within:shadow-soft">
      {label ? (
        <label htmlFor={inputId} className="text-xs uppercase tracking-widest">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={ariaInvalid ?? Boolean(error)}
          aria-describedby={describedBy}
          className={[
            "w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-brand-text shadow-sm outline-none transition focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-accent/20",
            isPasswordField ? "pr-11" : "",
            error ? "border-ember/70" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
          type={inputType}
        />
        {isPasswordField ? (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-brand-textMuted transition hover:text-ink"
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <span id={errorId} className="text-xs text-ember">
          {error}
        </span>
      ) : warning ? (
        <span id={warningId} className="text-xs font-medium text-amber-600">
          {warning}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-xs text-brand-textMuted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
