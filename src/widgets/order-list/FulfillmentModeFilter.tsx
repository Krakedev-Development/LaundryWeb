import { MODE_LABELS } from '../../services/BusinessService';
import { FilterSelect } from '../../shared/ui/FilterSelect';
import { OrderListModel } from '../../features/orders/model/useOrderList';

export function FulfillmentModeFilter({
  mode,
  setMode,
}: Pick<OrderListModel, 'mode' | 'setMode'>) {
  return (
    <FilterSelect label="Modalidad" value={mode} onChange={setMode}>
      <option value="ALL">Todas las modalidades</option>
      {Object.entries(MODE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </FilterSelect>
  );
}
