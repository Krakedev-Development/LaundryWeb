import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LocationTableState } from './useLocationTable';

export function LocationTablePagination({
  table,
}: {
  table: LocationTableState;
}) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-[11px] text-slate-500">
      <p role="status" aria-live="polite">
        {table.total
          ? `${table.start + 1}–${Math.min(table.start + table.pageSize, table.total)}`
          : '0'}{' '}
        de {table.total} resultados
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          Filas por página
          <select
            aria-label="Filas por página"
            className="ops-field !m-0 !w-20 !min-h-8 !py-1"
            value={table.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Página anterior de ubicaciones"
            disabled={table.page === 1}
            onClick={() => table.setPage(table.page - 1)}
            className="ops-button ops-button-compact"
          >
            <ChevronLeft />
          </button>
          <span>
            Página {table.page} de {table.pages}
          </span>
          <button
            type="button"
            aria-label="Página siguiente de ubicaciones"
            disabled={table.page === table.pages}
            onClick={() => table.setPage(table.page + 1)}
            className="ops-button ops-button-compact"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    </footer>
  );
}
