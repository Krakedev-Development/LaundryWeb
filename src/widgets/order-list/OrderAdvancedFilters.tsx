import { OrderListModel } from '../../features/orders/model/useOrderList';
import { FilterSelect } from '../../shared/ui/FilterSelect';
export function OrderAdvancedFilters({
  showAdvancedFilters,
  selectedStatus,
  setSelectedStatus,
  selectedPriority,
  setSelectedPriority,
  selectedFacility,
  setSelectedFacility,
  selectedDriver,
  setSelectedDriver,
  facilities,
  drivers,
}: Pick<
  OrderListModel,
  | 'showAdvancedFilters'
  | 'selectedStatus'
  | 'setSelectedStatus'
  | 'selectedPriority'
  | 'setSelectedPriority'
  | 'selectedFacility'
  | 'setSelectedFacility'
  | 'selectedDriver'
  | 'setSelectedDriver'
  | 'facilities'
  | 'drivers'
>) {
  return (
    <>
      {showAdvancedFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <FilterSelect
            label="Estado"
            value={selectedStatus}
            onChange={setSelectedStatus}
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PICKUP_PENDING">Sin asignar</option>
            <option value="PICKUP_ASSIGNED">Asignada a chofer</option>
            <option value="PICKED_UP">Recogida</option>
            <option value="AT_FACILITY">Recibida en planta</option>
            <option value="IN_PROCESS">En procesamiento</option>
            <option value="QUALITY_CONTROL">Control de calidad</option>
            <option value="READY_FOR_DELIVERY">Lista para entrega</option>
            <option value="OUT_FOR_DELIVERY">En entrega</option>
            <option value="QUARANTINE">Inscidencia</option>
            <option value="CLOSED">Finalizada</option>
          </FilterSelect>

          <FilterSelect
            label="Prioridad"
            value={selectedPriority}
            onChange={setSelectedPriority}
          >
            <option value="ALL">Todas las Prioridades</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Alta</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Baja</option>
          </FilterSelect>

          <FilterSelect
            label="Sede de Lavado"
            value={selectedFacility}
            onChange={setSelectedFacility}
          >
            <option value="ALL">Todas las Sedes</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Chofer Asignado"
            value={selectedDriver}
            onChange={setSelectedDriver}
          >
            <option value="ALL">Todos los Choferes</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.vehiclePlate})
              </option>
            ))}
          </FilterSelect>
        </div>
      )}
    </>
  );
}
