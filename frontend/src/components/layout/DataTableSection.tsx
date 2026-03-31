import type { ReactNode } from 'react';
import { ResponsiveTable, type ResponsiveColumn } from '../ui/ResponsiveTable';
import { ResultsToolbar } from './ResultsToolbar';
import { SectionCard } from './SectionCard';

type ToolbarProps = {
  summary: ReactNode;
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  actions?: ReactNode;
};

type DataTableSectionProps<T> = {
  columns: ResponsiveColumn<T>[];
  items: T[];
  getRowKey: (item: T) => string | number;
  renderMobileCard: (item: T) => ReactNode;
  toolbar?: ToolbarProps;
  className?: string;
  tableProps?: {
    ariaLabel?: string;
    caption?: string;
    maxDesktopHeightPx?: number;
    stickyHeader?: boolean;
    virtualized?: boolean;
    rowHeight?: number;
  };
};

export function DataTableSection<T>({
  columns,
  items,
  getRowKey,
  renderMobileCard,
  toolbar,
  className,
  tableProps,
}: DataTableSectionProps<T>) {
  return (
    <SectionCard className={className}>
      {toolbar ? (
        <ResultsToolbar
          summary={toolbar.summary}
          currentPage={toolbar.currentPage}
          totalPages={toolbar.totalPages}
          onPrevious={toolbar.onPrevious}
          onNext={toolbar.onNext}
          previousDisabled={toolbar.previousDisabled}
          nextDisabled={toolbar.nextDisabled}
          actions={toolbar.actions}
        />
      ) : null}
      <div className={toolbar ? 'mt-4' : undefined}>
        <ResponsiveTable
          columns={columns}
          items={items}
          getRowKey={getRowKey}
          renderMobileCard={renderMobileCard}
          ariaLabel={tableProps?.ariaLabel}
          caption={tableProps?.caption}
          maxDesktopHeightPx={tableProps?.maxDesktopHeightPx}
          stickyHeader={tableProps?.stickyHeader}
          virtualized={tableProps?.virtualized}
          rowHeight={tableProps?.rowHeight}
        />
      </div>
    </SectionCard>
  );
}
