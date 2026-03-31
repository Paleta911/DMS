import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TextFieldModal } from '../admin/TextFieldModal';
import type { SavedView } from '../../utils/savedViews';
import { useFeatureFlag } from '../../features/FeatureFlagsProvider';
import { useI18n } from '../../i18n/I18nProvider';

type SavedViewsToolbarProps<T> = {
  views: SavedView<T>[];
  onApply: (filters: T) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  emptyLabel?: string;
};

export function SavedViewsToolbar<T>({
  views,
  onApply,
  onSave,
  onDelete,
  emptyLabel,
}: SavedViewsToolbarProps<T>) {
  const [selectedViewId, setSelectedViewId] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const savedViewsEnabled = useFeatureFlag('saved-views');
  const { t } = useI18n();

  useEffect(() => {
    if (!selectedViewId || views.some((view) => view.id === selectedViewId)) {
      return;
    }
    setSelectedViewId('');
  }, [selectedViewId, views]);

  const selectedView = useMemo(
    () => views.find((view) => view.id === selectedViewId) ?? null,
    [selectedViewId, views],
  );

  if (!savedViewsEnabled) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-brand-border/70 bg-brand-bg/60 p-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Select
            label={t('savedViews.label')}
            value={selectedViewId}
            onChange={(event) => setSelectedViewId(event.target.value)}
          >
            <option value="">{emptyLabel ?? t('savedViews.empty')}</option>
            {views.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => selectedView && onApply(selectedView.filters)}
            disabled={!selectedView}
          >
            {t('savedViews.apply')}
          </Button>
          <Button variant="outline" onClick={() => setSaveOpen(true)}>
            {t('savedViews.save')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => selectedView && onDelete(selectedView.id)}
            disabled={!selectedView}
          >
            {t('savedViews.delete')}
          </Button>
        </div>
      </div>

      <TextFieldModal
        open={saveOpen}
        title={t('savedViews.modal.title')}
        label={t('savedViews.modal.label')}
        value={name}
        onChange={setName}
        onClose={() => {
          setSaveOpen(false);
          setName('');
        }}
        onConfirm={() => {
          onSave(name);
          setSaveOpen(false);
          setName('');
        }}
        confirmLabel={t('savedViews.modal.confirm')}
        confirmDisabled={!name.trim()}
      />
    </>
  );
}
