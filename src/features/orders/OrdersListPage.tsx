import { operationalStage } from '../../services/fulfillment';
import { MODE_LABELS, nextAction } from '../../services/BusinessService';
import { storageService } from '../../services/storage';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge, SLABadge } from '../../components/common/PriorityBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { AssignDriverModal } from '../../components/common/AssignDriverModal';
import { Order, OrderPriority, OrderStatus } from '../../types';
import {
  Search,
  Truck,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';

export const OrdersListPage: React.FC = () => {
  const { orders, facilities, drivers } = useApp();
  const navigate = useNavigate();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [mode,setMode] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  const [quickTab, setQuickTab] = useState<
    'ALL' | 'UNASSIGNED' | 'PICKUP_TODAY' | 'IN_PLANT' | 'DELIVERY' | 'CLOSED'
  >('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modal State for Quick Assignment
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);

  // Tab counters
  const tabCounts = useMemo(() => {
    return {
      ALL: orders.length,
      UNASSIGNED: orders.filter((o) => operationalStage(o) === 'PICKUP_PENDING')
        .length,
      PICKUP_TODAY: orders.filter((o) =>
        o.pickup.date.toLowerCase().includes('hoy'),
      ).length,
      IN_PLANT: orders.filter((o) =>
        ['AT_FACILITY', 'IN_PROCESS', 'QUALITY_CONTROL', 'QUARANTINE'].includes(
          operationalStage(o),
        ),
      ).length,
      DELIVERY: orders.filter((o) =>
        [
          'READY_FOR_DELIVERY',
          'DELIVERY_SCHEDULED',
          'DELIVERY_ASSIGNED',
          'OUT_FOR_DELIVERY',
        ].includes(operationalStage(o)),
      ).length,
      CLOSED: orders.filter((o) => operationalStage(o) === 'CLOSED').length,
    };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (mode !== 'ALL' && order.fulfillment?.mode !== mode) return false;
      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesTracking = order.trackingNumber.toLowerCase().includes(q);
        const matchesCustomer = order.customerName.toLowerCase().includes(q);
        const matchesAddress =
          order.customerAddress.street.toLowerCase().includes(q) ||
          order.customerAddress.neighborhood.toLowerCase().includes(q);
        if (
          !matchesId &&
          !matchesTracking &&
          !matchesCustomer &&
          !matchesAddress
        ) {
          return false;
        }
      }

      // Quick Tab Filter
      if (
        quickTab === 'UNASSIGNED' &&
        operationalStage(order) !== 'PICKUP_PENDING'
      )
        return false;
      if (
        quickTab === 'PICKUP_TODAY' &&
        !order.pickup.date.toLowerCase().includes('hoy')
      )
        return false;
      if (
        quickTab === 'IN_PLANT' &&
        ![
          'AT_FACILITY',
          'IN_PROCESS',
          'QUALITY_CONTROL',
          'QUARANTINE',
        ].includes(operationalStage(order))
      )
        return false;
      if (
        quickTab === 'DELIVERY' &&
        ![
          'READY_FOR_DELIVERY',
          'DELIVERY_SCHEDULED',
          'DELIVERY_ASSIGNED',
          'OUT_FOR_DELIVERY',
        ].includes(operationalStage(order))
      )
        return false;
      if (quickTab === 'CLOSED' && operationalStage(order) !== 'CLOSED')
        return false;

      // Dropdown filters
      if (
        selectedStatus !== 'ALL' &&
        operationalStage(order) !== selectedStatus
      )
        return false;
      if (selectedPriority !== 'ALL' && order.priority !== selectedPriority)
        return false;
      if (selectedFacility !== 'ALL' && order.facilityId !== selectedFacility)
        return false;
      if (selectedDriver !== 'ALL') {
        const isAssigned =
          order.pickup.driverId === selectedDriver ||
          order.delivery.driverId === selectedDriver;
        if (!isAssigned) return false;
      }

      return true;
    });
  }, [
    orders,
    quickTab,
    searchQuery,
    selectedStatus,
    selectedPriority,
    selectedFacility,
    selectedDriver,
    mode,
  ]);

  // Sort by priority then id
  const sortedOrders = useMemo(() => {
    const priorityWeight: Record<OrderPriority, number> = {
      URGENT: 4,
      HIGH: 3,
      NORMAL: 2,
      LOW: 1,
    };
    return [...filteredOrders].sort((a, b) => {
      const weightDiff =
        priorityWeight[b.priority] - priorityWeight[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return b.id.localeCompare(a.id);
    });
  }, [filteredOrders]);

  const problematicOrders = orders.filter(
    (o) =>
      operationalStage(o) === 'QUARANTINE' ||
      o.slaStatus === 'OVERDUE' ||
      o.incidentsCount > 0,
  );

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSelectedFacility('ALL');
    setSelectedDriver('ALL');
    setQuickTab('ALL');
  };

  const activeFiltersCount =
    (selectedStatus !== 'ALL' ? 1 : 0) +
    (selectedPriority !== 'ALL' ? 1 : 0) +
    (selectedFacility !== 'ALL' ? 1 : 0) +
    (selectedDriver !== 'ALL' ? 1 : 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Solicitudes"
        subtitle="Gestiona el ciclo completo de vida de las solicitudes, desde la recogida hasta la entrega final."
        actions={
          <button
            onClick={() => navigate('/operations/dispatch')}
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Consola de Despacho</span>
          </button>
        }
      />

      {/* Excepciones Operacionales Notice (if any) */}
      {problematicOrders.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/90 bg-amber-50/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Atención Requerida: {problematicOrders.length} solicitud(es)
                presentan excepciones operacionales
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Casos con SLA vencido, retención en inscidencia o incidencias
                activas en curso.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setQuickTab('ALL');
              setSelectedStatus('QUARANTINE');
            }}
            className="text-xs font-bold text-sky-800 hover:text-sky-900 hover:underline shrink-0"
          >
            Filtrar excepciones →
          </button>
        </div>
      )}

      {/* Main Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3"><label htmlFor="fulfillment-mode" className="text-sm font-semibold">Modalidad</label><select id="fulfillment-mode" value={mode} onChange={e=>setMode(e.target.value)} className="p-3 border border-slate-200 rounded-xl bg-white"><option value="ALL">Todas las modalidades</option>{Object.entries(MODE_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
        {/* Quick Segmented Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: 'ALL', label: 'Todas', count: tabCounts.ALL },
            {
              key: 'UNASSIGNED',
              label: 'Sin Asignar',
              count: tabCounts.UNASSIGNED,
              alert: tabCounts.UNASSIGNED > 0,
            },
            {
              key: 'PICKUP_TODAY',
              label: 'Recogida Hoy',
              count: tabCounts.PICKUP_TODAY,
            },
            { key: 'IN_PLANT', label: 'En Planta', count: tabCounts.IN_PLANT },
            { key: 'DELIVERY', label: 'En Entrega', count: tabCounts.DELIVERY },
            { key: 'CLOSED', label: 'Finalizadas', count: tabCounts.CLOSED },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setQuickTab(tab.key as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                quickTab === tab.key
                  ? 'bg-sky-50 text-sky-800 font-bold border border-sky-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full tabular-nums ${
                  quickTab === tab.key
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : tab.alert
                      ? 'bg-amber-100 text-amber-800 font-bold'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Toggle Filters Row */}
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

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Estado
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500"
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
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Prioridad
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Todas las Prioridades</option>
                <option value="URGENT">Urgente</option>
                <option value="HIGH">Alta</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Baja</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Sede de Lavado
              </label>
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Todas las Sedes</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Chofer Asignado
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Todos los Choferes</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.vehiclePlate})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Orders Data Table: Spacious, Clean, High Hierarchy */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {sortedOrders.length === 0 ? (
          <EmptyState
            title="No se encontraron solicitudes"
            subtitle="Prueba modificando los filtros de búsqueda o restableciendo los criterios seleccionados."
            action={{
              label: 'Restablecer filtros',
              onClick: resetFilters,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-5">Solicitud</th>
                  <th className="py-3.5 px-5">Cliente y Dirección</th>
                  <th className="py-3.5 px-5">Servicio</th>
                  <th className="py-3.5 px-5">Recogida</th>
                  <th className="py-3.5 px-5">Entrega</th>
                  <th className="py-3.5 px-5">Estado</th>
                  <th className="py-3.5 px-5">Prioridad</th>
                  <th className="py-3.5 px-5">SLA</th>
                  <th className="py-3.5 px-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/operations/orders/${order.id}`)}
                  >
                    {/* ID */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="font-bold text-sky-800 font-mono text-[13px]">
                        {order.id}
                      </span>
                      <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                        {order.trackingNumber}
                      </span>
                    </td>

                    {/* Cliente */}
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">
                        {order.customerAddress.neighborhood}
                      </div>
                    </td>

                    {/* Servicio */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {order.serviceType}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                        {order.itemCount} prendas · {order.pricing.amountKnown === false ? 'Importe pendiente de pesaje' : `$${order.pricing.total}`}
                      </div>
                    </td>

                    {/* Recogida */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {order.pickup.date}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {order.pickup.driverName ? (
                          <span className="text-emerald-700 font-medium">
                            {order.pickup.driverName}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">
                            Sin chofer
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Entrega */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {order.delivery.targetDate}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {order.delivery.driverName ? (
                          <span className="text-emerald-700 font-medium">
                            {order.delivery.driverName}
                          </span>
                        ) : (
                          <span className="text-slate-400">Por programar</span>
                        )}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StatusBadge
                        status={
                          order.fulfillment?.mode === 'STORE_STORE'
                            ? order.status
                            : operationalStage(order)
                        }
                        size="sm"
                      />
                      <span className="block text-[10px] text-slate-500 mt-1">
                        {MODE_LABELS[order.fulfillment?.mode ?? 'HOME_HOME']}
                        {order.businessVersion===3&&<span className="block text-xs text-slate-500 mt-1">Precio: {order.pricing.pricingStatus} · Pago: {order.pricing.paymentStatus}<br/>Entrada: {order.fulfillment?.inbound.status} · Salida: {order.fulfillment?.outbound.status}</span>}
                        {order.businessVersion === 3 && <span className="block text-blue-800 mt-1 whitespace-normal max-w-48">{nextAction(order,storageService.getWorkflow())}</span>}
                      </span>
                    </td>

                    {/* Prioridad */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <PriorityBadge priority={order.priority} />
                    </td>

                    {/* SLA */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <SLABadge
                        risk={order.slaStatus}
                        deadline={order.slaDeadline}
                      />
                    </td>

                    {/* Acciones */}
                    <td
                      className="py-4 px-5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {operationalStage(order) === 'PICKUP_PENDING' && (
                          <button
                            onClick={() => setAssigningOrder(order)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Asignar chofer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Asignar</span>
                          </button>
                        )}
                        <button
                          onClick={() =>
                            navigate(`/operations/orders/${order.id}`)
                          }
                          className="p-2 text-slate-500 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver detalle 360°"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando {sortedOrders.length} de {orders.length} solicitudes
            registradas
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            LaundryWeb Clean Operations
          </span>
        </div>
      </div>

      {/* Assign Driver Modal */}
      {assigningOrder && (
        <AssignDriverModal
          order={assigningOrder}
          type="pickup"
          isOpen={true}
          onClose={() => setAssigningOrder(null)}
        />
      )}
    </div>
  );
};
