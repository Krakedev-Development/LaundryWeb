import React, { useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import {
  getDriverLocationHistory,
  type DriverLocationHistoryResponse,
} from '../../../services/api/geoApi';

export function DriverRouteHistoryPanel({
  drivers,
  activeHistory,
  onLoadHistory,
  onClearHistory,
}: {
  drivers: Array<{ id: string; name: string }>;
  activeHistory: DriverLocationHistoryResponse | null;
  onLoadHistory(history: DriverLocationHistoryResponse): void;
  onClearHistory(): void;
}) {
  const [driverId, setDriverId] = useState('');
  const [hours, setHours] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    if (!driverId) return;
    setLoading(true);
    setError('');
    try {
      const to = new Date();
      const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
      const res = await getDriverLocationHistory(driverId, {
        from: from.toISOString(),
        to: to.toISOString(),
      });
      if (res.points.length < 2) {
        setError(
          `Sin suficiente recorrido registrado para ${res.driverName} en las últimas ${hours} h (${res.totalPoints} punto${res.totalPoints === 1 ? '' : 's'}).`,
        );
      }
      onLoadHistory(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el historial de recorrido.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ops-panel" aria-label="Historial de recorrido">
      <div className="ops-panel-header">
        <div className="ops-panel-title">
          <span className="ops-icon">
            <History />
          </span>
          <div>
            <h2 className="ops-heading">Historial de recorrido</h2>
            <p className="ops-caption">
              Consulta la traza GPS persistida en PostgreSQL sobre el mapa.
            </p>
          </div>
        </div>
        {activeHistory ? (
          <span className="ops-badge ops-badge-selected">
            {activeHistory.driverName} ·{' '}
            {(activeHistory.distanceMeters / 1000).toFixed(2)} km (
            {activeHistory.totalPoints} pts)
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="ops-label min-w-[200px] flex-1">
          Chofer
          <select
            aria-label="Chofer para historial de recorrido"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="ops-field"
          >
            <option value="">Seleccionar chofer</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="ops-label w-40">
          Ventana
          <select
            aria-label="Ventana de tiempo del historial"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="ops-field"
          >
            <option value={1}>Última hora</option>
            <option value={6}>Últimas 6 horas</option>
            <option value={24}>Últimas 24 horas</option>
          </select>
        </label>

        <button
          type="button"
          disabled={!driverId || loading}
          onClick={() => void handleFetch()}
          className="ops-button ops-button-primary"
        >
          <History size={15} />
          {loading ? 'Consultando...' : 'Ver recorrido'}
        </button>

        {activeHistory ? (
          <button
            type="button"
            onClick={() => {
              setError('');
              onClearHistory();
            }}
            className="ops-button ops-button-soft"
          >
            <Trash2 size={15} />
            Limpiar recorrido
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-amber-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
