import type { ReactNode } from 'react';
import { Button } from '../ui/Button';
import { ResponsiveActions } from './ResponsiveActions';
import { useI18n } from '../../i18n/I18nProvider';

type ResultsToolbarProps = {
  summary: ReactNode;
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  actions?: ReactNode;
  className?: string;
};

export function ResultsToolbar({
  summary,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  actions,
  className,
}: ResultsToolbarProps) {
  const { t } = useI18n();
  return (
    <div
      className={[
        'flex flex-wrap items-center justify-between gap-3 text-sm text-brand-textMuted',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="flex flex-wrap items-center gap-2">{summary}</span>
      <ResponsiveActions>
        {actions}
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={previousDisabled}
          aria-label={t('results.previousAria', { currentPage, totalPages })}
        >
          {t('results.previous')}
        </Button>
        <Button
          variant="outline"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label={t('results.nextAria', { currentPage, totalPages })}
        >
          {t('results.next')}
        </Button>
      </ResponsiveActions>
    </div>
  );
}
