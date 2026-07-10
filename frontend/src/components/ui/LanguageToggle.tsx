import { useI18n } from "../../i18n/I18nProvider";
import { useFeatureFlag } from "../../features/FeatureFlagsProvider";

// Locale switcher shown only when i18n feature flag is enabled.
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const i18nEnabled = useFeatureFlag("i18n");

  if (!i18nEnabled) {
    return null;
  }

  return (
    <label
      className={[
        "inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface px-3 py-2 text-sm font-semibold text-brand-text",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-brand-textMuted">{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as "es" | "en")}
        className="bg-transparent text-sm font-semibold text-brand-text outline-none"
      >
        <option value="es">{t("language.es")}</option>
        <option value="en">{t("language.en")}</option>
      </select>
    </label>
  );
}
