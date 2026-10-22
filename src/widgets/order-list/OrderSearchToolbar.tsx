import { Search, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { OrderListModel } from '../../features/orders/model/useOrderList';
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
    <>
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-100">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por N° solicitud (SOL-4587), cliente, tracking..."
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showAdvancedFilters || activeFiltersCount > 0
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros avanzados</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {(searchQuery || activeFiltersCount > 0 || quickTab !== 'ALL') && (
            <button
              onClick={resetFilters}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
