import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Send,
  Clock,
  Car,
  AlertCircle,
  Truck,
  MapPin,
  CheckCircle2,
  Gauge,
  Star,
  Building2,
  Navigation,
} from 'lucide-react';

export const DispatchPage: React.FC = () => {
  const { orders, drivers, facilities, assignDriver } = useApp();

  // Pending unassigned pickup orders
  const unassignedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'PICKUP_PENDING');
  }, [orders]);

  // Selected order in the queue
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    unassignedOrders[0]?.id || ''
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || unassignedOrders[0];

  // Notes for assignment
  const [assignNotes, setAssignNotes] = useState('');

  // KPIs
  const urgentCount = unassignedOrders.filter((o) => o.priority === 'URGENT').length;
  const availableDrivers = drivers.filter((d) => d.status === 'AVAILABLE').length;

  // Ranked suggested drivers for selected order
  const rankedDrivers = useMemo(() => {
    if (!selectedOrder) return [];

    return drivers.map((driver) => {
      const isZoneMatch = driver.zoneId === selectedOrder.zoneId;
      const isFacilityMatch = driver.facilityId === selectedOrder.facilityId;
      const isAvailable = driver.status === 'AVAILABLE' || driver.status === 'ON_DUTY';
      const isCapacityAvailable = driver.activeOrders < driver.maxOrders;

      // Proximity score (40%)
      const proximityScore = isZoneMatch ? 95 : isFacilityMatch ? 75 : 45;
      // Zone compatibility (30%)
      const zoneScore = isZoneMatch ? 100 : 40;
      // Current load capacity (20%)
      const loadScore = Math.max(0, 100 - (driver.activeOrders / driver.maxOrders) * 100);
      // Rating / Historical performance (10%)
      const performanceScore = (driver.rating / 5) * 100;

      const totalScore = Math.round(
        proximityScore * 0.4 + zoneScore * 0.3 + loadScore * 0.2 + performanceScore * 0.1
      );

      const estimatedEtaMinutes = isZoneMatch ? 12 : isFacilityMatch ? 24 : 38;

      return {
        driver,
        totalScore,
        estimatedEtaMinutes,
        isAvailable,
        isCapacityAvailable,
        isZoneMatch,
        explanation: isZoneMatch
          ? `Misma zona (${driver.zoneName}), tiempo de llegada óptimo (~${estimatedEtaMinutes} min)`
          : `Requiere cruce de zona desde ${driver.facilityName} (~${estimatedEtaMinutes} min)`,
      };
    }).sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return b.totalScore - a.totalScore;
    });
  }, [drivers, selectedOrder]);

  const handleQuickAssign = (driverId: string) => {
    if (!selectedOrder) return;
    const ok = assignDriver(selectedOrder.id, driverId, 'pickup', assignNotes);
    if (ok) {
      setAssignNotes('');
      const remaining = unassignedOrders.filter((o) => o.id !== selectedOrder.id);
      if (remaining.length > 0) {
        setSelectedOrderId(remaining[0].id);
      }
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Despacho y asignación"
        subtitle="Asignación rápida y optimizada de choferes para recogidas pendientes mediante motor de recomendación."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Sin Asignar"
          value={unassignedOrders.length}
          subtitle="En cola de espera"
          variant={unassignedOrders.length > 0 ? 'urgent' : 'default'}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <MetricCard
          title="Urgentes"
          value={urgentCount}
          subtitle="Máxima prioridad operativa"
          variant={urgentCount > 0 ? 'urgent' : 'default'}
          icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
        />
        <MetricCard
          title="Choferes Disponibles"
          value={`${availableDrivers}/${drivers.length}`}
          subtitle="Flota lista para despacho"
          variant="success"
          icon={<Car className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Tiempo Promedio Despacho"
          value="4.2 min"
          subtitle="Meta operacional: < 8 min"
          variant="aqua"
          icon={<Send className="w-5 h-5 text-sky-600" />}
        />
      </div>

      {unassignedOrders.length === 0 ? (
        <EmptyState
          title="Todo está bajo control en Despacho"
          subtitle="No existen solicitudes pendientes de asignación de chofer. Todas las recogidas están asignadas a la flota."
        />
      ) : (
        /* Main 2-panel Console */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Orders Queue (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Cola de Recogidas ({unassignedOrders.length})
              </span>
              <span className="text-[11px] text-slate-400">Por prioridad</span>
            </div>

            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {unassignedOrders.map((ord) => {
                const isSelected = selectedOrder?.id === ord.id;
                return (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-2 ring-sky-500/20'
                        : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-sky-800 font-mono">{ord.id}</span>
                      <PriorityBadge priority={ord.priority} />
                    </div>

                    <p className="font-semibold text-xs text-slate-900 truncate">
                      {ord.customerName}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{ord.customerAddress.neighborhood} ({ord.zoneName})</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600">
                      <span>Franja: <strong>{ord.pickup.timeSlot}</strong></span>
                      <span className="font-mono tabular-nums">{ord.itemCount} prendas</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Area: Map Preview + Recommended Drivers (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Interactive Dispatch Map Panel */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-sky-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Posicionamiento Operativo en Tiempo Real
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Choferes disponibles
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> En ruta
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Recogida ({selectedOrder?.id})
                  </span>
                </div>
              </div>

              {/* Clean Light Operational Map Viewport */}
              <div className="h-64 bg-[#F1F5F9] rounded-2xl relative overflow-hidden border border-slate-200 p-4">
                {/* Subtle Grid styling */}
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
                    backgroundSize: '36px 36px',
                  }}
                />

                {/* Sede Marker */}
                <div className="absolute top-8 left-12 flex items-center gap-1.5 bg-[#0F4C81] text-white px-3 py-1.5 rounded-xl shadow-md text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{selectedOrder?.facilityName || 'Clean Hub'}</span>
                </div>

                {/* Order Pickup Marker */}
                <div className="absolute top-24 right-20 flex items-center gap-1.5 bg-rose-600 text-white px-3 py-1.5 rounded-xl shadow-lg text-xs font-bold ring-4 ring-rose-400/20">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Recogida: {selectedOrder?.customerAddress.neighborhood}</span>
                </div>

                {/* Driver Markers scattered */}
                {drivers.slice(0, 4).map((d, idx) => (
                  <div
                    key={d.id}
                    className={`absolute flex items-center gap-1.5 px-2.5 py-1 rounded-lg shadow-xs text-[11px] font-semibold ${
                      d.status === 'AVAILABLE'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                    style={{
                      bottom: `${24 + idx * 30}px`,
                      left: `${15 + idx * 22}%`,
                    }}
                  >
                    <Truck className="w-3 h-3" />
                    <span>{d.name.split(' ')[0]} ({d.vehiclePlate})</span>
                  </div>
                ))}

                {/* Simulated route connection line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path
                    d="M 120 40 Q 250 90, 440 110"
                    stroke="#0F4C81"
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            {/* Algorithm Suggestion Engine Header */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-800">
                <Gauge className="w-4 h-4 text-sky-700" />
                <span className="font-bold">
                  Motor de Recomendación para {selectedOrder?.id}:
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                <span>Proximidad <strong>40%</strong></span>
                <span>·</span>
                <span>Zona <strong>30%</strong></span>
                <span>·</span>
                <span>Carga <strong>20%</strong></span>
                <span>·</span>
                <span>Rating <strong>10%</strong></span>
              </div>
            </div>

            {/* Drivers Ranking List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Choferes Disponibles Ordenados por Afinidad
              </h3>

              <div className="space-y-3">
                {rankedDrivers.map(({ driver, totalScore, estimatedEtaMinutes, isAvailable, isCapacityAvailable, explanation }) => {
                  const canAssign = isAvailable && isCapacityAvailable;
                  return (
                    <div
                      key={driver.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        canAssign
                          ? 'border-slate-200 hover:border-sky-300 hover:bg-slate-50/60'
                          : 'border-slate-200 bg-slate-50/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={driver.avatar}
                          alt={driver.name}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-xs text-slate-900">{driver.name}</span>
                            <span className="text-[11px] font-mono text-slate-500">[{driver.vehiclePlate}]</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                driver.status === 'AVAILABLE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                              }`}
                            >
                              {driver.status === 'AVAILABLE' ? 'Disponible' : 'En ruta'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            <span>Sede: {driver.facilityName}</span>
                            <span>·</span>
                            <span>Carga: <strong>{driver.activeOrders}/{driver.maxOrders}</strong></span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              {driver.rating}
                            </span>
                            <span>·</span>
                            <span className="font-semibold text-slate-700">ETA: ~{estimatedEtaMinutes} min</span>
                          </div>

                          <p className="text-[11px] text-slate-500 italic mt-1">{explanation}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Match</span>
                          <span
                            className={`text-lg font-extrabold font-mono tabular-nums ${
                              totalScore >= 80 ? 'text-sky-700' : totalScore >= 60 ? 'text-amber-600' : 'text-slate-500'
                            }`}
                          >
                            {totalScore}%
                          </span>
                        </div>

                        <button
                          disabled={!canAssign}
                          onClick={() => handleQuickAssign(driver.id)}
                          className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Asignar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
