type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
};

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-7 w-12 items-center rounded-full border transition',
        checked
          ? 'border-brand-primary bg-brand-primary/20'
          : 'border-brand-border bg-brand-surface',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 rounded-full transition',
          checked
            ? 'translate-x-6 bg-brand-primary'
            : 'translate-x-1 bg-brand-textMuted/70',
        ].join(' ')}
      />
    </button>
  );
}
