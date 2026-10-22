import React, { useState } from 'react';
import { BaseMap } from '../../../components/maps/BaseMap';
import type { Zone } from '../../../entities/zone/model/zone.types';
import { zoneContains } from '../../../entities/zone/model/zone.rules';
import type { Coordinates } from '../../../services/geo/geo.types';
import { Dialog } from '../../../shared/ui/Dialog';
import { AddressSearch } from './AddressSearch';

export function FacilityLocationPicker({
  zones,
  initialZone,
  onPick,
  onClose,
}: {
  zones: Zone[];
  initialZone?: string;
  onPick(zone: Zone, point: Coordinates, address?: string): void;
  onClose(): void;
}) {
  const [zoneId, setZoneId] = useState(
    zones.find((zone) => zone.id === initialZone && zone.active)?.id ??
      zones.find((zone) => zone.active)?.id ??
      '',
  );
  const [error, setError] = useState('');
  const [located, setLocated] = useState<Coordinates>();
  const zone = zones.find((item) => item.id === zoneId);
  const pick = (point: Coordinates, address?: string) => {
    if (!zone?.active || !zoneContains(zone, point)) {
      setError('Ubica el pin dentro del polígono de la zona seleccionada.');
      return;
    }
    onPick(zone, point, address);
  };
  return (
    <Dialog title="Ubicar nueva sede" onClose={onClose}>
      <div className="space-y-4">
        <label className="ops-label">
          Zona de la sede
          <select
            value={zoneId}
            onChange={(event) => {
              setZoneId(event.target.value);
              setError('');
              setLocated(undefined);
            }}
            className="ops-field"
          >
            {zones
              .filter((item) => item.active)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <p className="ops-note">
          Busca la dirección o coloca el pin dentro de la zona. Se abrirá el
          formulario para completar los datos de la sede.
        </p>
        {!zones.some((item) => item.active) && (
          <p role="alert" className="text-sm text-amber-800">
            Crea o activa una zona antes de registrar una sede.
          </p>
        )}
        <AddressSearch
          onLocate={(point, address) => {
            setLocated(point);
            pick(point, address);
          }}
        />
        <BaseMap
          fitZones
          zones={zone ? [zone] : []}
          center={located}
          onPick={(point) => pick(point)}
          height={400}
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="button" onClick={onClose} className="ops-button">
          Cancelar
        </button>
      </div>
    </Dialog>
  );
}
