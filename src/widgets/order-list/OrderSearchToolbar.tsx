import { motion } from 'motion/react';
import { Search, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { OrderListModel } from '../../features/orders/model/useOrderList';
import { focusRing } from '../../shared/ui/controls';

export function OrderSearchToolbar({
  searchQuery,
  setSearchQuery,
  showAdvancedFilters,
  setShowAdvancedFilters,
  activeFiltersCount,
  resetFilters,
  quickTab,
}: Pick<
  OrderListModel,
  | 'searchQuery'
  | 'setSearchQuery'
  | 'showAdvancedFilters'
  | 'setShowAdvancedFilters'
  | 'activeFiltersCount'
  | 'resetFilters'
  | 'quickTab'
>) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:flex-row">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          aria-label="Buscar solicitudes"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por N° solicitud, cliente o tracking..."
          className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-ink placeholder:text-slate-400 transition-all hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          aria-expanded={showAdvancedFilters}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${focusRing} ${
            showAdvancedFilters || activeFiltersCount > 0
              ? 'border-primary/25 bg-primary-soft text-primary'
              : 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-ink'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filtros avanzados</span>
          {activeFiltersCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white tabular-nums">
              {activeFiltersCount}
            </span>
          )}
        </motion.button>

        {(searchQuery || activeFiltersCount > 0 || quickTab !== 'ALL') && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={resetFilters}
            className={`flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink ${focusRing}`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restablecer</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
