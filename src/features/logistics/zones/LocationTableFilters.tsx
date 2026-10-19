import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { driverStates } from '../../../components/maps/mapPointAppearance';
import { locationKinds } from './mapLocationPresentation';
import type { LocationTableState } from './useLocationTable';

export function LocationTableFilters({ table }: { table: LocationTableState }) {
  return (
    <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1.5fr)_1fr_1fr_1fr_auto]">
      <label className="ops-label">
        Buscar ubicación
        <span className="ops-search mt-1.5 block">
          <Search aria-hidden="true" />
          <input
            aria-label="Buscar ubicación"
            value={table.query}
            onChange={(event) => table.setQuery(event.target.value)}
            className="ops-field"
            placeholder="Nombre, solicitud o dirección..."
          />
        </span>
      </label>
      <label className="ops-label">
        Tipo de ubicación
        <select
          aria-label="Tipo de ubicación"
          value={table.kind}
          onChange={(event) => table.setKind(event.target.value)}
          className="ops-field"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(locationKinds).map(([key, kind]) => (
            <option key={key} value={key}>
              {kind.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ops-label">
        Estado del chofer
        <select
          aria-label="Estado del chofer"
          value={table.status}
          onChange={(event) => table.setStatus(event.target.value)}
          className="ops-field"
        >
          <option value="">Todos los estados</option>
          {Object.entries(driverStates).map(([key, state]) => (
            <option key={key} value={key}>
              {state.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ops-label">
        Actualización GPS
        <select
          aria-label="Actualización GPS"
          value={table.freshness}
          onChange={(event) => table.setFreshness(event.target.value)}
          className="ops-field"
        >
          <option value="">Todas las ubicaciones</option>
          <option value="recent">Choferes con ubicación reciente</option>
          <option value="stale">Choferes con ubicación desactualizada</option>
        </select>
      </label>
      <button
        type="button"
        disabled={!table.hasFilters}
        onClick={table.reset}
        className="ops-button self-end"
      >
        <RotateCcw aria-hidden="true" />
        Limpiar filtros
      </button>
    </div>
  );
}
