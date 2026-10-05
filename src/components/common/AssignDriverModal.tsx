import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Order } from '../../types';
import { useDriverCandidates } from '../maps/useDriverCandidates';
import { geoConfig } from '../../services/geo/geo.config';
export const AssignDriverModal = ({
  order,
  type,
  isOpen,
  onClose,
}: {
  order: Order;
  type: 'pickup' | 'delivery';
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { drivers, assignDriver } = useApp();
  const { candidates, loading, error } = useDriverCandidates(
    isOpen ? order : undefined,
    type,
  );
  const [selected, setSelected] = useState(''),
    [notes, setNotes] = useState('');
  useEffect(() => {
    setSelected('');
    setNotes('');
  }, [order.id, type, isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Asignar chofer"
        className="bg-white rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-auto space-y-4"
      >
        <div className="flex justify-between">
          <h2 className="font-bold">
            Asignar {type === 'pickup' ? 'recogida' : 'entrega'} · {order.id}
          </h2>
          <button onClick={onClose} aria-label="Cerrar">
            Cerrar
          </button>
        </div>
        {geoConfig.mode === 'demo' && (
          <p className="text-sm text-amber-800">
            Tiempos y distancias de demostración.
          </p>
        )}
        {loading && <p role="status">Calculando mejores choferes…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && !candidates.length && (
          <p>No hay choferes elegibles con una ruta disponible.</p>
        )}
        {candidates.map((candidate, i) => {
          const driver = drivers.find((d) => d.id === candidate.driverId)!;
          return (
            <label
              key={driver.id}
              className="block border rounded-xl p-4 cursor-pointer"
            >
              <input
                type="radio"
                name="driver"
                checked={selected === driver.id}
                onChange={() => setSelected(driver.id)}
              />{' '}
              <strong>{driver.name}</strong>
              {i === 0 && <span className="ml-2 text-sm">Recomendado</span>}
              <p className="text-sm mt-2">
                {Math.ceil(candidate.etaSeconds! / 60)} min ·{' '}
                {(candidate.distanceMeters! / 1000).toFixed(1)} km ·{' '}
                {driver.facilityName}
              </p>
              <p className="text-xs text-slate-600">
                {candidate.reasons.join(' · ')}
              </p>
            </label>
          );
        })}
        <label className="block text-sm">
          Notas
          <textarea
            className="block border rounded-lg p-2 w-full mt-1"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          disabled={!candidates.some((c) => c.driverId === selected) || loading}
          className="bg-[#143F73] text-white rounded-lg px-4 py-2 disabled:opacity-40"
          onClick={() => {
            if (assignDriver(order.id, selected, type, notes)) onClose();
          }}
        >
          Confirmar asignación
        </button>
      </section>
    </div>
  );
};
