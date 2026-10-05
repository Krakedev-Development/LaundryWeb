import { operationalStage } from '../../services/fulfillment';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SLABadge } from '../../components/common/PriorityBadge';
import { Order } from '../../types';
import {
  Truck,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  Send,
} from 'lucide-react';

export const DeliveriesPage: React.FC = () => {
  const { orders, drivers, scheduleDelivery, updateOrderStatus } = useApp();
  const navigate = useNavigate();

  // Selected order for the right scheduling panel
  const deliveryOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.fulfillment?.mode !== 'STORE_STORE' &&
        [
          'READY_FOR_DELIVERY',
          'DELIVERY_SCHEDULED',
          'DELIVERY_ASSIGNED',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
        ].includes(operationalStage(o)),
    );
  }, [orders]);

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    deliveryOrders[0]?.id || '',
  );

  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) || deliveryOrders[0];

  // Scheduling Form state
  const [targetDate, setTargetDate] = useState('Hoy');
  const [timeSlot, setTimeSlot] = useState('16:00 - 18:00');
  const [driverId, setDriverId] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Table filter
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL');

  // KPIs
  const toDeliverTodayCount = deliveryOrders.filter((o) =>
    o.delivery.targetDate.toLowerCase().includes('hoy'),
  ).length;
  const onRouteCount = deliveryOrders.filter(
    (o) => operationalStage(o) === 'OUT_FOR_DELIVERY',
  ).length;
  const deliveredTodayCount = deliveryOrders.filter(
    (o) => operationalStage(o) === 'DELIVERED',
  ).length;
  const slaRate = Math.round(
    (deliveryOrders.filter((o) => o.slaStatus === 'ON_TIME').length /
      (deliveryOrders.length || 1)) *
      100,
  );

  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter((o) => {
      if (statusFilter !== 'ALL' && operationalStage(o) !== statusFilter)
        return false;
      if (driverFilter !== 'ALL' && o.delivery.driverId !== driverFilter)
        return false;
      return true;
    });
  }, [deliveryOrders, statusFilter, driverFilter]);

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    scheduleDelivery(
      selectedOrder.id,
      targetDate,
      timeSlot,
      selectedOrder.delivery.recipientName || selectedOrder.customerName,
      selectedOrder.delivery.recipientPhone || selectedOrder.customerPhone,
      deliveryNotes,
      driverId || undefined,
    );
  };

  const handleConfirmDelivered = (orderId: string) => {
    updateOrderStatus(
      orderId,
      'DELIVERED',
      'Entrega confirmada con el cliente',
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Entregas"
        subtitle="Planificación de rutas, programación de franjas horarias y confirmación de entregas."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="A Entregar Hoy"
          value={toDeliverTodayCount}
          subtitle="Programadas para la fecha"
          icon={<Calendar className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="En Ruta de Entrega"
          value={onRouteCount}
          subtitle="Vehículos en trayecto"
          variant="aqua"
          icon={<Truck className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Entregadas Hoy"
          value={deliveredTodayCount}
          subtitle="Conformidad del cliente"
          variant="success"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Cumplimiento SLA"
          value={`${slaRate}%`}
          subtitle="Entregas dentro de ventana"
          icon={<Clock className="w-5 h-5 text-sky-600" />}
        />
      </div>

      {/* Main Layout: Deliveries Table + Side Scheduling Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Deliveries Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Listado de Entregas ({filteredOrders.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecciona una orden para gestionar su ruta
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="READY_FOR_DELIVERY">Listas para entrega</option>
                <option value="DELIVERY_SCHEDULED">Programada</option>
                <option value="DELIVERY_ASSIGNED">Chofer asignado</option>
                <option value="OUT_FOR_DELIVERY">En entrega</option>
                <option value="DELIVERED">Entregada</option>
              </select>

              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todos los Choferes</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Orden y Cliente</th>
                  <th className="py-3 px-4">Horario</th>
                  <th className="py-3 px-4">Chofer</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">SLA</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => {
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrderId(ord.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-sky-800 font-mono text-[13px]">
                          {ord.id}
                        </span>
                        <span className="block font-semibold text-slate-900 truncate max-w-[140px] mt-0.5">
                          {ord.customerName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800">
                          {ord.delivery.targetDate}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                          {ord.delivery.timeSlot}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {ord.delivery.driverName ? (
                          <span className="font-semibold text-emerald-700">
                            {ord.delivery.driverName}
                          </span>
                        ) : (
                          <span className="text-amber-600 italic">
                            Por asignar
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={operationalStage(ord)} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <SLABadge risk={ord.slaStatus} />
                      </td>

                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {operationalStage(ord) === 'OUT_FOR_DELIVERY' && (
                          <button
                            onClick={() => handleConfirmDelivered(ord.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                          >
                            Entregada
                          </button>
                        )}
                        {operationalStage(ord) === 'DELIVERY_ASSIGNED' && (
                          <button
                            onClick={() =>
                              updateOrderStatus(
                                ord.id,
                                'OUT_FOR_DELIVERY',
                                'Chofer en ruta hacia entrega',
                              )
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs cursor-pointer"
                          >
                            Despachar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Side Scheduling Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          {selectedOrder ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-sky-800 uppercase tracking-wider bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200/60">
                    Programación de Entrega
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">
                    Solicitud {selectedOrder.id}
                  </h3>
                </div>
                <button
                  onClick={() =>
                    navigate(`/operations/orders/${selectedOrder.id}`)
                  }
                  className="text-xs text-sky-700 font-semibold hover:underline"
                >
                  Detalle 360° ↗
                </button>
              </div>

              {/* Destination Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <User className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>{selectedOrder.customerName}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {selectedOrder.customerAddress.street},{' '}
                    {selectedOrder.customerAddress.neighborhood}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedOrder.customerPhone}</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha de Entrega
                  </label>
                  <select
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Hoy">Hoy</option>
                    <option value="Mañana">Mañana</option>
                    <option value="En 2 días">En 2 días</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Franja Horaria
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="09:00 - 11:00">
                      09:00 - 11:00 (Mañana)
                    </option>
                    <option value="11:00 - 13:00">
                      11:00 - 13:00 (Mediodía)
                    </option>
                    <option value="14:00 - 16:00">
                      14:00 - 16:00 (Tarde temprana)
                    </option>
                    <option value="16:00 - 18:00">
                      16:00 - 18:00 (Tarde pico)
                    </option>
                    <option value="18:00 - 20:00">18:00 - 20:00 (Noche)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chofer de Entrega
                  </label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Seleccionar chofer...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.zoneName} ·{' '}
                        {d.status === 'AVAILABLE' ? 'Disponible' : 'En ruta'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Instrucciones de Entrega
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Instrucciones al conserje, código de intercom..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0F4C81] hover:bg-[#0A3660] text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Guardar Programación de Entrega</span>
                </button>
              </form>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Selecciona una entrega en la tabla para programarla.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
