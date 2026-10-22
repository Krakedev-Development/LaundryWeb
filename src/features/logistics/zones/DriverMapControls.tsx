import React, { useSyncExternalStore } from 'react';
import { Pause, Play, RotateCcw, LocateFixed, Route, Info } from 'lucide-react';
import { demoTrackingControls } from '../../../services/geo/DemoTrackingControls';
import type { Driver } from '../../../types';

export function DriverMapControls({
  drivers,
  selected,
  onSelect,
  following,
  onFollow,
}: {
  drivers: Driver[];
  selected: string;
  onSelect(id: string): void;
  following: boolean;
  onFollow(): void;
}) {
  const journeys = useSyncExternalStore(
    demoTrackingControls.subscribe,
    demoTrackingControls.snapshot,
  );
  const journey = journeys.find((item) => item.driverId === selected);
  return (
    <section className="ops-panel" aria-label="Control de movimiento">
      <div className="ops-panel-header">
        <div className="ops-panel-title">
          <span className="ops-icon">
            <Route />
          </span>
          <div>
            <h2 className="ops-heading">Seguimiento de choferes</h2>
            <p className="ops-caption">
              Ubicación y controles del recorrido seleccionado.
            </p>
          </div>
        </div>
        <span className="ops-badge">Demo local</span>
      </div>
      <div className="ops-driver-controls">
        <label className="ops-label ops-driver-select">
          Chofer
          <select
            aria-label="Chofer en el mapa"
            value={selected}
            onChange={(event) => onSelect(event.target.value)}
            className="ops-field"
          >
            <option value="">Seleccionar chofer</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!selected}
          aria-pressed={following}
          onClick={onFollow}
          className="ops-button ops-button-soft"
        >
          <LocateFixed size={16} />
          {following ? 'Dejar de seguir' : 'Seguir ubicación'}
        </button>
        <button
          type="button"
          disabled={!journey}
          onClick={() =>
            demoTrackingControls.execute(
              selected,
              journey?.paused ? 'resume' : 'pause',
            )
          }
          className="ops-button"
        >
          {journey?.paused ? <Play size={16} /> : <Pause size={16} />}
          {journey?.paused ? 'Reanudar' : 'Pausar'} simulación
        </button>
        <button
          type="button"
          disabled={!journey}
          onClick={() => demoTrackingControls.execute(selected, 'restart')}
          className="ops-button"
        >
          <RotateCcw size={16} />
          Reiniciar recorrido
        </button>
      </div>
      <p className="ops-control-note">
        <Info size={14} className="shrink-0" aria-hidden="true" />
        Movimiento de demostración local. Los controles actúan sobre recorridos
        en curso; no cambian el estado del servicio.
      </p>
    </section>
  );
}
