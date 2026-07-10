import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { buildStaggerItem, listItemTransition } from "./Motion";

// Responsive data table with optional virtualization, column visibility toggles, and column resizing.
export type ResponsiveColumn<T> = {
  id?: string;
  header: string;
  cell: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  minWidth?: number;
  width?: number;
  hideable?: boolean;
  defaultHidden?: boolean;
};

export function ResponsiveTable<T>({
  columns,
  items,
  renderMobileCard,
  getRowKey,
  emptyLabel = "Sin registros",
  caption,
  ariaLabel,
  maxDesktopHeightPx,
  stickyHeader = false,
  virtualized = false,
  rowHeight = 72,
  overscan = 4,
  onRowClick,
  rowClassName,
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
  onRowClick?: (item: T) => void;
  rowClassName?: string | ((item: T) => string | undefined);
}) {
  const reduceMotion = useReducedMotion();
  const rowVariants = buildStaggerItem(8);
  const cardVariants = buildStaggerItem(10);
  const accessibleLabel = ariaLabel ?? caption ?? "Tabla de resultados";
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = maxDesktopHeightPx ?? 480;
  const shouldVirtualize = virtualized && items.length > 25;
  const headerRefs = useRef<Array<HTMLTableCellElement | null>>([]);
  const dragStateRef = useRef<{
    columnIndex: number;
    startX: number;
    startWidths: number[];
  } | null>(null);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const getColumnLabel = useCallback(
    (column: ResponsiveColumn<T>, index: number) =>
      column.header.trim() || `Columna ${index + 1}`,
    [],
  );
  const columnIds = useMemo(
    () =>
      columns.map(
        (column, index) =>
          column.id ?? `${getColumnLabel(column, index)}-${index}`,
      ),
    [columns, getColumnLabel],
  );
  const columnSignature = useMemo(
    () =>
      columns
        .map(
          (column, index) =>
            `${column.id ?? getColumnLabel(column, index)}-${index}:${column.width ?? ""}:${column.minWidth ?? ""}:${column.hideable ?? true}:${column.defaultHidden ?? false}`,
        )
        .join("|"),
    [columns, getColumnLabel],
  );
  const visibleColumns = useMemo(
    () =>
      columns.filter((_, index) => {
        const columnId = columnIds[index];
        return !hiddenColumnIds.includes(columnId);
      }),
    [columnIds, columns, hiddenColumnIds],
  );
  const visibleColumnCount = visibleColumns.length;

  useEffect(() => {
    // Reset table UI state when column definitions change.
    headerRefs.current = [];
    setColumnWidths([]);
    setHiddenColumnIds(
      columns
        .map((column, index) =>
          column.defaultHidden ? columnIds[index] : null,
        )
        .filter((columnId): columnId is string => Boolean(columnId)),
    );
    setIsColumnMenuOpen(false);
  }, [columnIds, columnSignature, columns]);

  const getMeasuredWidths = useCallback(() => {
    // Measure rendered headers to seed resize widths with realistic defaults.
    return columns.map((column, index) => {
      const measuredWidth = Math.round(
        headerRefs.current[index]?.getBoundingClientRect().width ?? 0,
      );
      const fallbackWidth = column.width ?? column.minWidth ?? 140;
      return Math.max(column.minWidth ?? 72, measuredWidth || fallbackWidth);
    });
  }, [columns]);

  useEffect(() => {
    if (!isResizing) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }
      const nextWidths = [...dragState.startWidths];
      const column = columns[dragState.columnIndex];
      const minWidth = column.minWidth ?? 72;
      nextWidths[dragState.columnIndex] = Math.max(
        minWidth,
        dragState.startWidths[dragState.columnIndex] +
          (event.clientX - dragState.startX),
      );
      setColumnWidths(nextWidths);
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      setIsResizing(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [columns, isResizing]);

  useEffect(() => {
    if (!isColumnMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && columnMenuRef.current?.contains(target)) {
        return;
      }
      setIsColumnMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsColumnMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isColumnMenuOpen]);

  const startResize = (columnIndex: number, clientX: number) => {
    const baseWidths =
      columnWidths.length === columns.length
        ? columnWidths
        : getMeasuredWidths();
    dragStateRef.current = {
      columnIndex,
      startX: clientX,
      startWidths: baseWidths,
    };
    setColumnWidths(baseWidths);
    setIsResizing(true);
  };

  const handleResizeMouseDown = (
    columnIndex: number,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    startResize(columnIndex, event.clientX);
  };

  const handleResizeKeyDown = (
    columnIndex: number,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const baseWidths =
      columnWidths.length === columns.length
        ? columnWidths
        : getMeasuredWidths();
    const nextWidths = [...baseWidths];
    const column = columns[columnIndex];
    const minWidth = column.minWidth ?? 72;
    const delta = event.key === "ArrowRight" ? 24 : -24;
    nextWidths[columnIndex] = Math.max(
      minWidth,
      baseWidths[columnIndex] + delta,
    );
    setColumnWidths(nextWidths);
  };

  const toggleColumnVisibility = (columnId: string) => {
    setHiddenColumnIds((current) => {
      if (current.includes(columnId)) {
        return current.filter((id) => id !== columnId);
      }
      if (visibleColumnCount <= 1) {
        // Always keep at least one column visible.
        return current;
      }
      return [...current, columnId];
    });
  };

  const tableWidth = useMemo(() => {
    if (columnWidths.length !== columns.length) {
      return undefined;
    }
    const totalWidth = columns.reduce((sum, column, index) => {
      if (hiddenColumnIds.includes(columnIds[index])) {
        return sum;
      }
      return (
        sum + (columnWidths[index] ?? column.width ?? column.minWidth ?? 140)
      );
    }, 0);
    return Math.max(totalWidth, 1100);
  }, [columnIds, columnWidths, columns, hiddenColumnIds]);

  const resolveRowClassName = (item: T) =>
    typeof rowClassName === "function" ? rowClassName(item) : rowClassName;

  const visibleRange = useMemo(() => {
    // Lightweight windowing for large datasets in desktop mode.
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
  }, [
    items.length,
    overscan,
    rowHeight,
    scrollTop,
    shouldVirtualize,
    viewportHeight,
  ]);
  const desktopItems = shouldVirtualize
    ? items.slice(visibleRange.start, visibleRange.end)
    : items;

  return (
    <div className="min-w-0 flex flex-col gap-3">
      {columns.length > 1 ? (
        <div className="flex justify-end" ref={columnMenuRef}>
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-brand-textMuted transition hover:text-ink"
              aria-label={
                isColumnMenuOpen
                  ? "Ocultar menú de columnas"
                  : "Mostrar menú de columnas"
              }
              aria-pressed={isColumnMenuOpen}
              onClick={() => setIsColumnMenuOpen((current) => !current)}
            >
              {isColumnMenuOpen ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {isColumnMenuOpen ? (
              <div className="absolute right-0 z-20 mt-2 min-w-60 rounded-xl border border-brand-border bg-brand-surface p-2 shadow-soft">
                <div className="px-2 pb-2 text-xs uppercase tracking-widest text-brand-textMuted">
                  Columnas
                </div>
                <div className="grid gap-1">
                  {columns.map((column, index) => {
                    const columnId = columnIds[index];
                    const isVisible = !hiddenColumnIds.includes(columnId);
                    const canHide =
                      (column.hideable ?? true) && visibleColumnCount > 1;
                    return (
                      <button
                        key={columnId}
                        type="button"
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-brand-text transition hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => toggleColumnVisibility(columnId)}
                        disabled={
                          !(column.hideable ?? true) || (!canHide && isVisible)
                        }
                      >
                        <span className="truncate">
                          {getColumnLabel(column, index)}
                        </span>
                        {isVisible ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} className="text-brand-textMuted" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="min-w-0 hidden md:block">
        <div
          className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface"
          style={
            maxDesktopHeightPx
              ? { maxHeight: `${maxDesktopHeightPx}px`, overflowY: "auto" }
              : undefined
          }
          onScroll={
            shouldVirtualize
              ? (event) => setScrollTop(event.currentTarget.scrollTop)
              : undefined
          }
        >
          <table
            className="min-w-[1100px] w-full border-collapse text-left text-sm"
            aria-label={accessibleLabel}
            style={
              tableWidth
                ? { width: `${tableWidth}px`, minWidth: `${tableWidth}px` }
                : undefined
            }
          >
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <colgroup>
              {visibleColumns.map((column) => {
                const index = columns.indexOf(column);
                const width = columnWidths[index] ?? column.width;
                return (
                  <col
                    key={`${column.header}-${index}`}
                    style={{
                      width:
                        typeof width === "number" ? `${width}px` : undefined,
                      minWidth:
                        typeof column.minWidth === "number"
                          ? `${column.minWidth}px`
                          : undefined,
                    }}
                  />
                );
              })}
            </colgroup>
            <thead
              className={
                stickyHeader
                  ? "bg-brand-bg/70 sticky top-0 z-10"
                  : "bg-brand-bg/70"
              }
            >
              <tr>
                {visibleColumns.map((column) => {
                  const index = columns.indexOf(column);
                  return (
                    <th
                      key={columnIds[index]}
                      className={[
                        "px-4 py-3 table-head",
                        column.headerClassName,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      ref={(node) => {
                        headerRefs.current[index] = node;
                      }}
                    >
                      <div className="relative flex min-h-6 items-center pr-4">
                        <span>{column.header}</span>
                        <button
                          type="button"
                          aria-label={`Redimensionar columna ${getColumnLabel(column, index)}`}
                          onMouseDown={(event) =>
                            handleResizeMouseDown(index, event)
                          }
                          onKeyDown={(event) =>
                            handleResizeKeyDown(index, event)
                          }
                          className="group absolute -right-3 top-0 h-full w-6 cursor-col-resize touch-none focus:outline-none"
                        >
                          <span className="pointer-events-none absolute right-3 top-1/2 h-5 -translate-y-1/2 border-r border-brand-border/35 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100" />
                          <span className="pointer-events-none absolute right-[9px] top-1/2 h-7 -translate-y-1/2 border-r border-brand-accent/80 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="px-4 py-6 text-brand-textMuted"
                  >
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                <>
                  {shouldVirtualize && visibleRange.topSpacer > 0 ? (
                    <tr aria-hidden="true">
                      <td
                        colSpan={visibleColumns.length}
                        style={{ height: `${visibleRange.topSpacer}px` }}
                      />
                    </tr>
                  ) : null}
                  {desktopItems.map((item, index) => (
                    <motion.tr
                      key={
                        getRowKey ? getRowKey(item) : index + visibleRange.start
                      }
                      className={[
                        "border-t border-brand-border",
                        onRowClick
                          ? "cursor-pointer transition hover:bg-brand-bg/60"
                          : "",
                        resolveRowClassName(item),
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      initial={reduceMotion ? false : "hidden"}
                      animate="show"
                      variants={rowVariants}
                      transition={listItemTransition(
                        index + visibleRange.start,
                      )}
                      onClick={onRowClick ? () => onRowClick(item) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onRowClick(item);
                              }
                            }
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      role={onRowClick ? "button" : undefined}
                    >
                      {visibleColumns.map((column) => (
                        <td
                          key={column.id ?? column.header}
                          className={["px-4 py-3", column.className]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {column.cell(item)}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                  {shouldVirtualize && visibleRange.bottomSpacer > 0 ? (
                    <tr aria-hidden="true">
                      <td
                        colSpan={visibleColumns.length}
                        style={{ height: `${visibleRange.bottomSpacer}px` }}
                      />
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
          <div className="card p-4 text-sm text-brand-textMuted">
            {emptyLabel}
          </div>
        ) : (
          <ul aria-label={accessibleLabel} className="grid gap-3">
            {items.map((item, index) => (
              <motion.li
                key={getRowKey ? getRowKey(item) : index}
                className={[
                  "card list-none p-4",
                  onRowClick
                    ? "cursor-pointer transition hover:bg-brand-bg/60"
                    : "",
                  resolveRowClassName(item),
                ]
                  .filter(Boolean)
                  .join(" ")}
                initial={reduceMotion ? false : "hidden"}
                animate="show"
                variants={cardVariants}
                transition={listItemTransition(index, 0.03, 0.25)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(item);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
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
