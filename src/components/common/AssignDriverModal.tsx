import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, Driver } from '../../types';
import { X, Truck, ShieldCheck, Star, MapPin, Gauge } from 'lucide-react';

interface AssignDriverModalProps {
  order: Order;
  type: 'pickup' | 'delivery';
  isOpen: boolean;
  onClose: () => void;
}

export const AssignDriverModal: React.FC<AssignDriverModalProps> = ({
  order,
  type,
  isOpen,
  onClose,
}) => {
  const { drivers, assignDriver } = useApp();
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter and score eligible drivers per spec #23:
  // Proximity: 40%, Zone match: 30%, Load capacity: 20%, History/Rating: 10%
  const scoredDrivers = drivers.map((driver) => {
    const isZoneMatch = driver.zoneId === order.zoneId;
    const isFacilityMatch = driver.facilityId === order.facilityId;
    const isAvailable = driver.status === 'AVAILABLE' || driver.status === 'ON_DUTY';
    const isCapacityAvailable = driver.activeOrders < driver.maxOrders;

    // Proximity score (simulated based on same zone / location coords)
    const proximityScore = isZoneMatch ? 95 : 50;
    // Zone score
    const zoneScore = isZoneMatch ? 100 : 30;
    // Load score (fewer active orders = higher score)
    const loadScore = Math.max(0, 100 - (driver.activeOrders / driver.maxOrders) * 100);
    // Rating score
    const ratingScore = (driver.rating / 5) * 100;

    const totalScore = Math.round(
      proximityScore * 0.4 + zoneScore * 0.3 + loadScore * 0.2 + ratingScore * 0.1
    );

    return {
      driver,
      totalScore,
      isAvailable,
      isCapacityAvailable,
      isZoneMatch,
      isFacilityMatch,
      recommendationReason: isZoneMatch
        ? `Alta compatibilidad de zona (${driver.zoneName}) con capacidad operativa disponible`
        : `Disponible en sede alternativa, mayor tiempo de desplazamiento`,
    };
  });

  // Sort by score descending, eligible first
  scoredDrivers.sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    return b.totalScore - a.totalScore;
  });

  const handleConfirm = () => {
    if (!selectedDriverId) return;
    setIsSubmitting(true);
    const success = assignDriver(order.id, selectedDriverId, type, notes);
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                Motor de Despacho
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {type === 'pickup' ? 'Asignar Recogida' : 'Asignar Entrega'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Asignar chofer a {order.id}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cliente: {order.customerName} · Zona: {order.zoneName} · {order.customerAddress.neighborhood}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Algorithm criteria breakdown indicator */}
        <div className="px-6 py-2.5 bg-sky-50/60 border-b border-sky-100 flex items-center justify-between text-xs text-sky-900">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-sky-600" />
            <span className="font-semibold">Criterios de recomendación algorítmica:</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span>Proximidad <strong>40%</strong></span>
            <span>·</span>
            <span>Zona <strong>30%</strong></span>
            <span>·</span>
            <span>Carga <strong>20%</strong></span>
            <span>·</span>
            <span>Historial <strong>10%</strong></span>
          </div>
        </div>

        {/* Driver List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {scoredDrivers.map(({ driver, totalScore, isAvailable, isCapacityAvailable, recommendationReason }) => {
            const isSelected = selectedDriverId === driver.id;
            const canAssign = isAvailable && isCapacityAvailable;

            return (
              <div
                key={driver.id}
                onClick={() => canAssign && setSelectedDriverId(driver.id)}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-[#0F4C81] bg-sky-50/50 shadow-xs'
                    : canAssign
                    ? 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer'
                    : 'border-slate-200 bg-slate-50/80 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={driver.avatar}
                      alt={driver.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{driver.name}</span>
                        <span className="text-xs text-slate-500 font-mono">({driver.vehiclePlate})</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            driver.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : driver.status === 'ON_DUTY'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {driver.status === 'AVAILABLE' ? 'Disponible' : driver.status === 'ON_DUTY' ? 'En servicio' : 'No disponible'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          {driver.vehicleType}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {driver.zoneName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <strong className="text-slate-800">{driver.rating}</strong>
                        </span>
                        <span>
                          Carga: <strong className="text-slate-800 tabular-nums">{driver.activeOrders}/{driver.maxOrders}</strong> pedidos
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] text-slate-500 italic">
                        {recommendationReason}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex flex-col items-end">
                      <span className="text-xs text-slate-500 font-medium">Match</span>
                      <span
                        className={`text-base font-extrabold tabular-nums ${
                          totalScore >= 80 ? 'text-[#0F4C81]' : totalScore >= 60 ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      >
                        {totalScore}%
                      </span>
                    </div>
                    {isSelected && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-800" /> Seleccionado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes & Actions */}
        <div className="p-5 border-t border-slate-200/80 bg-slate-50/70 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Instrucciones u observaciones para el chofer (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Avisar por intercomunicador o llamar 5 minutos antes"
              className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">
              {selectedDriverId ? 'Listo para despachar' : 'Selecciona un chofer de la lista sugerida'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedDriverId || isSubmitting}
                onClick={handleConfirm}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                Confirmar Asignación
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
