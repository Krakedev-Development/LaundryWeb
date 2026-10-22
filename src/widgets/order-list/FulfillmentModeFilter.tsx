import { MODE_LABELS } from '../../services/BusinessService';
import { OrderListModel } from '../../features/orders/model/useOrderList';
export function FulfillmentModeFilter({
  mode,
  setMode,
}: Pick<OrderListModel, 'mode' | 'setMode'>) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="fulfillment-mode" className="text-sm font-semibold">
          Modalidad
        </label>
        <select
          id="fulfillment-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="p-3 border border-slate-200 rounded-xl bg-white"
        >
          <option value="ALL">Todas las modalidades</option>
          {Object.entries(MODE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
