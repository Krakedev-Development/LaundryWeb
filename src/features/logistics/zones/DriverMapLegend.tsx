import React from 'react';
import { driverStates } from '../../../components/maps/mapPointAppearance';

export function DriverMapLegend() {
  return (
    <div className="ops-map-legend" aria-label="Estados de los choferes">
      {Object.entries(driverStates).map(([key, state]) => (
        <span key={key} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: state.color }}
            aria-hidden="true"
          />
          {state.label}
        </span>
      ))}
      <span>Ubicación desactualizada: marcador atenuado</span>
    </div>
  );
}
