import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { useFeatureFlag } from "../../features/FeatureFlagsProvider";
import { useI18n } from "../../i18n/I18nProvider";

// Dropdown menu for export actions (CSV/JSON/etc.) gated by advanced-exports feature flag.
export type ExportOption = {
  key: string;
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
};

export function ExportMenu({
  label,
  options,
}: {
  label?: string;
  options: ExportOption[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const advancedExportsEnabled = useFeatureFlag("advanced-exports");
  const { t } = useI18n();

  useEffect(() => {
    if (!open) {
      return;
    }
    // Close menu when user clicks outside the menu root.
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!advancedExportsEnabled) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="secondary"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label ?? t("export.label")}
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 min-w-[180px] rounded-2xl border border-brand-border bg-brand-surface p-2 shadow-soft"
        >
          <div className="flex flex-col gap-1">
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                role="menuitem"
                disabled={option.disabled}
                onClick={async () => {
                  await option.onClick();
                  setOpen(false);
                }}
                className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand-text transition hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
