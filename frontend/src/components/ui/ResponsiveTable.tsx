import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { buildStaggerItem, listItemTransition } from './Motion';

export type ResponsiveColumn<T> = {
  header: string;
  cell: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export function ResponsiveTable<T>({
  columns,
  items,
  renderMobileCard,
  getRowKey,
  emptyLabel = 'Sin registros',
  caption,
  ariaLabel,
  maxDesktopHeightPx,
  stickyHeader = false,
  virtualized = false,
  rowHeight = 72,
  overscan = 4,
}: {
  columns: ResponsiveColumn<T>[];
  items: T[];
  renderMobileCard: (item: T) => ReactNode;
  getRowKey?: (item: T) => string | number;
  emptyLabel?: string;
  caption?: string;
  ariaLabel?: string;
  maxDesktopHeightPx?: number;
  stickyHeader?: boolean;
  virtualized?: boolean;
  rowHeight?: number;
  overscan?: number;
}) {
  const reduceMotion = useReducedMotion();
  const rowVariants = buildStaggerItem(8);
  const cardVariants = buildStaggerItem(10);
  const accessibleLabel = ariaLabel ?? caption ?? 'Tabla de resultados';
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = maxDesktopHeightPx ?? 480;
  const shouldVirtualize = virtualized && items.length > 25;
  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        start: 0,
        end: items.length,
        topSpacer: 0,
        bottomSpacer: 0,
      };
    }

    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(items.length, start + visibleCount);
    return {
      start,
      end,
      topSpacer: start * rowHeight,
      bottomSpacer: Math.max(0, (items.length - end) * rowHeight),
    };
  }, [items.length, overscan, rowHeight, scrollTop, shouldVirtualize, viewportHeight]);
  const desktopItems = shouldVirtualize
    ? items.slice(visibleRange.start, visibleRange.end)
    : items;

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden md:block">
        <div
          className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface"
          style={maxDesktopHeightPx ? { maxHeight: `${maxDesktopHeightPx}px`, overflowY: 'auto' } : undefined}
          onScroll={shouldVirtualize ? (event) => setScrollTop(event.currentTarget.scrollTop) : undefined}
        >
          <table
            className="min-w-[1100px] w-full border-collapse text-left text-sm"
            aria-label={accessibleLabel}
          >
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <thead className={stickyHeader ? 'bg-brand-bg/70 sticky top-0 z-10' : 'bg-brand-bg/70'}>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.header}
                    className={['px-4 py-3 table-head', column.headerClassName].filter(Boolean).join(' ')}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-6 text-brand-textMuted">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                <>
                  {shouldVirtualize && visibleRange.topSpacer > 0 ? (
                    <tr aria-hidden="true">
                      <td colSpan={columns.length} style={{ height: `${visibleRange.topSpacer}px` }} />
                    </tr>
                  ) : null}
                  {desktopItems.map((item, index) => (
                  <motion.tr
                    key={getRowKey ? getRowKey(item) : index + visibleRange.start}
                    className="border-t border-brand-border"
                    initial={reduceMotion ? false : 'hidden'}
                    animate="show"
                    variants={rowVariants}
                    transition={listItemTransition(index + visibleRange.start)}
                  >
                    {columns.map((column) => (
                      <td key={column.header} className={['px-4 py-3', column.className].filter(Boolean).join(' ')}>
                        {column.cell(item)}
                      </td>
                    ))}
                  </motion.tr>
                  ))}
                  {shouldVirtualize && visibleRange.bottomSpacer > 0 ? (
                    <tr aria-hidden="true">
                      <td colSpan={columns.length} style={{ height: `${visibleRange.bottomSpacer}px` }} />
                    </tr>
                  ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {items.length === 0 ? (
          <div className="card p-4 text-sm text-brand-textMuted">{emptyLabel}</div>
        ) : (
          <ul aria-label={accessibleLabel} className="grid gap-3">
            {items.map((item, index) => (
              <motion.li
                key={getRowKey ? getRowKey(item) : index}
                className="card list-none p-4"
                initial={reduceMotion ? false : 'hidden'}
                animate="show"
                variants={cardVariants}
                transition={listItemTransition(index, 0.03, 0.25)}
              >
                {renderMobileCard(item)}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
