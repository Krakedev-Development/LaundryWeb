import { LocateFixed, Route } from 'lucide-react';
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
  return (
    <section className="ops-panel" aria-label="Seguimiento de choferes">
      <div className="ops-panel-header">
        <div className="ops-panel-title">
          <span className="ops-icon">
            <Route />
          </span>
          <div>
            <h2 className="ops-heading">Seguimiento de choferes</h2>
            <p className="ops-caption">
              Ubicación del chofer seleccionado.
            </p>
          </div>
        </div>
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
      </div>
    </section>
  );
}
