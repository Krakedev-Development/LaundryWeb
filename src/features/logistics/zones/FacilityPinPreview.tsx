import React, { useState } from 'react';
import { BaseMap } from '../../../components/maps/BaseMap';
import type { Zone } from '../../../entities/zone/model/zone.types';
import { zoneContains } from '../../../entities/zone/model/zone.rules';
import type { Coordinates } from '../../../services/geo/geo.types';

export function FacilityPinPreview({
  zones,
  zoneId,
  point,
  onMove,
}: {
  zones: Zone[];
  zoneId?: string;
  point: Coordinates;
  onMove(point: Coordinates): void;
}) {
  const zone = zones.find((item) => item.id === zoneId);
  const [error, setError] = useState('');
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-semibold">
        {zone?.name ?? 'Ubicación de la sede'}
      </p>
      <p className="text-xs text-slate-500">
        El pin marca la sede. Puedes ajustar su ubicación dentro del polígono.
      </p>
      <BaseMap
        fitZones
        height={220}
        zones={zone ? [zone] : zones}
        center={point}
        points={[
          {
            id: 'facility-draft',
            label: 'Ubicación de la sede',
            kind: 'facility',
            coordinates: point,
          },
        ]}
        onPick={(position) => {
          if (!zone || zoneContains(zone, position)) {
            onMove(position);
            setError('');
          } else
            setError('El pin debe permanecer dentro de la zona de la sede.');
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
