import { MODE_LABELS } from '../../services/BusinessService';
import { OrderListModel } from '../../features/orders/model/useOrderList';

export function FulfillmentModeFilter({
  mode,
  setMode,
}: Pick<OrderListModel, 'mode' | 'setMode'>) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor="fulfillment-mode"
        className="text-xs font-semibold tracking-wide text-slate-600"
      >
        Modalidad
      </label>
      <select
        id="fulfillment-mode"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-2xs transition-all hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
      >
        <option value="ALL">Todas las modalidades</option>
        {Object.entries(MODE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
