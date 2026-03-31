import type { ReactNode } from 'react';

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-brand-bg/70">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 table-head">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-brand-textMuted">
                Sin registros
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-t border-brand-border">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
