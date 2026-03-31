import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { useFeatureFlag } from '../../features/FeatureFlagsProvider';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const darkModeEnabled = useFeatureFlag('dark-mode');
  const isDark = theme === 'dark';

  if (!darkModeEnabled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        isDark ? t('theme.switch.light') : t('theme.switch.dark')
      }
      aria-pressed={isDark}
      title={isDark ? t('theme.switch.light') : t('theme.switch.dark')}
      className={[
        'inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm font-semibold text-brand-text transition hover:bg-brand-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? t('theme.mode.light') : t('theme.mode.dark')}</span>
    </button>
  );
}
