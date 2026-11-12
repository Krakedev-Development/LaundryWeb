import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const TABLE_PAGE_SIZE = 15;

export interface Pagination<T> {
  rows: T[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  start: number;
  setPage(page: number): void;
}

// Pagina en el navegador una lista ya filtrada. `resetKey` debe cambiar cuando cambian
// los filtros o la búsqueda, para volver a la primera página; si la lista se achica, la
// página actual se ajusta sola a la última disponible.
export function usePagination<T>(
  items: readonly T[],
  resetKey: unknown = undefined,
  pageSize = TABLE_PAGE_SIZE,
): Pagination<T> {
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [resetKey]);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  return {
    rows: items.slice(start, start + pageSize),
    page: current,
    totalPages,
    total: items.length,
    pageSize,
    start,
    setPage,
  };
}

// Envoltorio para tablas dentro de vistas con retornos condicionales: la paginación
// vive en este componente, así no altera el orden de los hooks de la vista.
export function PaginatedTable<T>({
  items,
  label,
  resetKey,
  hideWhenSinglePage = false,
  children,
}: {
  items: readonly T[];
  label: string;
  resetKey?: unknown;
  hideWhenSinglePage?: boolean;
  children(rows: T[]): ReactNode;
}) {
  const pagination = usePagination(items, resetKey);
  return (
    <>
      {children(pagination.rows)}
      <TablePagination
        pagination={pagination}
        label={label}
        hideWhenSinglePage={hideWhenSinglePage}
      />
    </>
  );
}

// Pie de tabla: rango mostrado, página actual y botones anterior/siguiente.
// `label` nombra lo que se lista (p. ej. "clientes") para los lectores de pantalla.
export function TablePagination<T>({
  pagination,
  label,
  hideWhenSinglePage = false,
  className = '',
}: {
  pagination: Pagination<T>;
  label: string;
  hideWhenSinglePage?: boolean;
  className?: string;
}) {
  const { page, totalPages, total, pageSize, start, setPage } = pagination;
  if (total === 0 || (hideWhenSinglePage && totalPages === 1)) return null;
  const end = Math.min(start + pageSize, total);
  return (
    <nav
      aria-label={`Paginación de ${label}`}
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 ${className}`}
    >
      <p role="status" aria-live="polite">
        {start + 1}–{end} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Página anterior de ${label}`}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          aria-label={`Página siguiente de ${label}`}
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
