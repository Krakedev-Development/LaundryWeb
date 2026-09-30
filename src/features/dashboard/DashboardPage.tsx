import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import {
  ClipboardList,
  Clock,
  Truck,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Flame,
  Building2,
  Boxes,
  Sparkles,
  CheckCircle2,
  Send,
  Eye,
} from 'lucide-react';
import { OrderStatus } from '../../types';

export const DashboardPage: React.FC = () => {
  const { orders, incidents, drivers, customers, facilities, currentUser, auditLogs } = useApp();
  const navigate = useNavigate();

  const isAdmin = currentUser.role === 'ADMIN';

  // Key Metrics
  const totalOrdersToday = orders.length;
  const unassignedOrders = orders.filter((o) => o.status === 'PICKUP_PENDING');
  const inDeliveryOrders = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERY_ASSIGNED');
  const onTimeCount = orders.filter((o) => o.slaStatus === 'ON_TIME').length;
  const slaCompliance = Math.round((onTimeCount / (orders.length || 1)) * 100);
  const openIncidents = incidents.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
  const quarantineOrders = orders.filter((o) => o.status === 'QUARANTINE');
  const atRiskOrders = orders.filter((o) => o.slaStatus === 'AT_RISK' || o.slaStatus === 'OVERDUE');
  const pendingKyc = customers.filter((c) => c.kycStatus === 'PENDING');

  // Grouped operational stages for clear visual hierarchy
  const phasePickup = orders.filter((o) =>
    ['CREATED', 'PICKUP_PENDING', 'PICKUP_ASSIGNED', 'HEADING_TO_PICKUP', 'PICKED_UP'].includes(o.status)
  ).length;

  const phasePlant = orders.filter((o) =>
    ['AT_FACILITY', 'IN_PROCESS', 'QUALITY_CONTROL', 'QUARANTINE'].includes(o.status)
  ).length;

  const phaseDelivery = orders.filter((o) =>
    ['READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED', 'DELIVERY_ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)
  ).length;

  return (
    <div className="space-y-8">
      {/* Header with clean actions */}
      <PageHeader
        title="Dashboard Operativo"
        subtitle="Monitoreo central en tiempo real del ciclo de recogida, planta de lavado y entregas."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/operations/dispatch')}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Consola de Despacho</span>
            </button>
            <button
              onClick={() => navigate('/operations/orders')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              Ver Solicitudes
            </button>
          </div>
        }
      />

      {/* Primary KPI Grid: High breathing room & clean light surfaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Solicitudes del Día"
          value={totalOrdersToday}
          subtitle="Órdenes activas en sistema"
          icon={<ClipboardList className="w-5 h-5 text-sky-600" />}
          onClick={() => navigate('/operations/orders')}
        />
        <MetricCard
          title="Pendientes de Chofer"
          value={unassignedOrders.length}
          subtitle="Requieren asignación en despacho"
          variant={unassignedOrders.length > 0 ? 'warning' : 'default'}
          icon={<Clock className="w-5 h-5" />}
          onClick={() => navigate('/operations/dispatch')}
        />
        <MetricCard
          title="Entregas en Ruta"
          value={inDeliveryOrders.length}
          subtitle="Vehículos en trayecto"
          variant="aqua"
          icon={<Truck className="w-5 h-5 text-sky-600" />}
          onClick={() => navigate('/operations/deliveries')}
        />
        <MetricCard
          title="Cumplimiento SLA"
          value={`${slaCompliance}%`}
          subtitle="Compromiso horario cumplido"
          variant={slaCompliance >= 95 ? 'success' : 'warning'}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Main 2-Column Section: Operational Flow + Priority Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Flujo Macro-Operativo */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Flujo del Ciclo Operativo
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribución organizada por las tres grandes fases de servicio
                </p>
              </div>
              <button
                onClick={() => navigate('/operations/orders')}
                className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Macro Phases Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {/* Phase 1: Recogida */}
              <div
                onClick={() => navigate('/operations/dispatch')}
                className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-sky-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-extrabold text-slate-900 font-sans tabular-nums">
                    {phasePickup}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 mt-3 group-hover:text-sky-700 transition-colors">
                  1. Recogida y Despacho
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {unassignedOrders.length} sin chofer asignado
                </p>
              </div>

              {/* Phase 2: Planta */}
              <div
                onClick={() => navigate('/operations/plant')}
                className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-sky-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-extrabold text-slate-900 font-sans tabular-nums">
                    {phasePlant}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 mt-3 group-hover:text-indigo-700 transition-colors">
                  2. Planta de Lavado
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {quarantineOrders.length > 0 ? `${quarantineOrders.length} en cuarentena` : 'Proceso regular'}
                </p>
              </div>

              {/* Phase 3: Entrega */}
              <div
                onClick={() => navigate('/operations/deliveries')}
                className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-sky-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-extrabold text-slate-900 font-sans tabular-nums">
                    {phaseDelivery}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 mt-3 group-hover:text-emerald-700 transition-colors">
                  3. Entrega a Domicilio
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {inDeliveryOrders.length} en ruta final
                </p>
              </div>
            </div>

            {/* Visual Breakdown of Stages */}
            <div className="mt-7 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-600 mb-3">
                Distribución detallada por estado operativo:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Sin asignar</span>
                  <span className="text-sm font-bold text-amber-700 font-mono tabular-nums">{unassignedOrders.length}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">En lavado</span>
                  <span className="text-sm font-bold text-slate-800 font-mono tabular-nums">
                    {orders.filter((o) => o.status === 'IN_PROCESS').length}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Control Calidad</span>
                  <span className="text-sm font-bold text-slate-800 font-mono tabular-nums">
                    {orders.filter((o) => o.status === 'QUALITY_CONTROL').length}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Listas p/ entrega</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
                    {orders.filter((o) => o.status === 'READY_FOR_DELIVERY').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sedes Operativas Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-700" />
                <h3 className="text-sm font-bold text-slate-900">Capacidad en Sedes de Lavado</h3>
              </div>
              <button
                onClick={() => navigate('/logistics/facilities')}
                className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline"
              >
                Ver sedes ↗
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {facilities.map((fac) => {
                const loadPct = Math.round((fac.currentLoadKgDay / fac.capacityMaxKgDay) * 100);
                return (
                  <div key={fac.id} className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{fac.name}</span>
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        {fac.status === 'ACTIVE' ? 'Operativa' : 'Mantenimiento'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{fac.zone}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600 font-mono">
                      <span>Carga diaria:</span>
                      <span className="font-bold text-slate-800">{fac.currentLoadKgDay} / {fac.capacityMaxKgDay} kg ({loadPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${loadPct > 80 ? 'bg-amber-500' : 'bg-sky-600'}`}
                        style={{ width: `${loadPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Atención Inmediata & Alertas */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Atención Requerida
                  </h3>
                  <p className="text-xs text-slate-500">
                    Casos que necesitan decisión del operador
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full font-mono tabular-nums">
                {unassignedOrders.length + atRiskOrders.length + quarantineOrders.length + openIncidents.length + (isAdmin ? pendingKyc.length : 0)}
              </span>
            </div>

            {/* List of actionable items */}
            <div className="divide-y divide-slate-100 mt-2">
              {/* Unassigned orders */}
              {unassignedOrders.length > 0 && (
                <div
                  onClick={() => navigate('/operations/dispatch')}
                  className="py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                        {unassignedOrders.length} orden(es) sin chofer de recogida
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Primera: {unassignedOrders[0].id} · {unassignedOrders[0].customerName}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-700 flex items-center gap-0.5 shrink-0">
                    Asignar <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}

              {/* SLA at risk */}
              {atRiskOrders.length > 0 && (
                <div
                  onClick={() => navigate('/operations/orders?filter=at_risk')}
                  className="py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                        {atRiskOrders.length} orden(es) en riesgo de SLA
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Límite próximo: {atRiskOrders[0].id} ({atRiskOrders[0].slaDeadline})
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-rose-700 flex items-center gap-0.5 shrink-0">
                    Ver <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}

              {/* Quarantine */}
              {quarantineOrders.length > 0 && (
                <div
                  onClick={() => navigate('/operations/plant')}
                  className="py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                        {quarantineOrders.length} lote(s) en cuarentena
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {quarantineOrders[0].id}: {quarantineOrders[0].quarantineReason || 'Inspección de fibra'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-red-700 flex items-center gap-0.5 shrink-0">
                    Revisar <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}

              {/* Pending KYC (Admin) */}
              {isAdmin && pendingKyc.length > 0 && (
                <div
                  onClick={() => navigate('/customers/kyc')}
                  className="py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                        {pendingKyc.length} validación(es) KYC pendientes
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cliente: {pendingKyc[0].fullName}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-700 flex items-center gap-0.5 shrink-0">
                    Evaluar <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}

              {/* Incidents */}
              {openIncidents.length > 0 && (
                <div
                  onClick={() => navigate('/operations/incidents')}
                  className="py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {openIncidents.length} incidencia(s) en investigación
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Caso {openIncidents[0].id}: {openIncidents[0].type}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 flex items-center gap-0.5 shrink-0">
                    Gestionar <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Access to Drivers Status */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Estado de Flota Activa</h3>
              <button
                onClick={() => navigate('/logistics/drivers')}
                className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline"
              >
                Ver todos ({drivers.length}) ↗
              </button>
            </div>
            <div className="space-y-3 mt-3">
              {drivers.slice(0, 3).map((driver) => (
                <div key={driver.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2.5">
                    <img src={driver.avatar} alt={driver.name} className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                    <div>
                      <p className="font-semibold text-slate-800">{driver.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{driver.vehiclePlate} · {driver.facilityName}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${driver.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-800 border border-amber-200/60'}`}>
                    {driver.status === 'AVAILABLE' ? 'Disponible' : 'En ruta'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actividad Reciente / Bitácora Operacional */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bitácora Operacional Reciente
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro trazable de cambios de estado, asignaciones y eventos de auditoría
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Trazabilidad activa</span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4">Entidad / ID</th>
                <th className="py-3 px-4">Estado Previo</th>
                <th className="py-3 px-4">Nuevo Valor</th>
                <th className="py-3 px-4">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-sky-700 font-semibold whitespace-nowrap">
                    {log.entityId}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 truncate max-w-xs">
                    {log.previousValue || '-'}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 truncate max-w-xs">
                    {log.newValue || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    <span className="font-semibold">{log.userName}</span>{' '}
                    <span className="text-[11px] text-slate-400">({log.userRole})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
