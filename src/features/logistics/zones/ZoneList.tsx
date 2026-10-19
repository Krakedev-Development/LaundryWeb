import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { ZoneListItem } from './ZoneListItem';
import type { Zone } from '../../../entities/zone/model/zone.types';
import type { Facility } from '../../../types';
import { facilityZoneId } from '../../../entities/zone/model/zone.rules';
export function ZoneList({
  zones,
  facilities,
  editable,
  selected,
  setSelected,
  onEdit,
  onAdd,
}: {
  zones: Zone[];
  facilities: Facility[];
  editable: boolean;
  selected: string;
  setSelected(id: string): void;
  onEdit(zone: Zone): void;
  onAdd(id: string): void;
}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('ALL');
  const shown = zones.filter(
    (zone) =>
      zone.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (state === 'ALL' || zone.active === (state === 'ACTIVE')),
  );
  return (
    <div className="ops-zone-sidebar space-y-4">
      <label className="ops-search block">
        <Search size={16} />
        <input
          aria-label="Buscar zonas"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar zonas"
          className="ops-field"
        />
      </label>
      <select
        aria-label="Estado de las zonas"
        value={state}
        onChange={(event) => setState(event.target.value)}
        className="ops-field !mt-0"
      >
        <option value="ALL">Todos los estados</option>
        <option value="ACTIVE">Activas</option>
        <option value="INACTIVE">Inactivas</option>
      </select>
      <button
        type="button"
        onClick={() => setSelected('')}
        className="ops-button ops-button-ghost ops-button-compact w-full"
      >
        Ver todas las zonas
      </button>
      <div className="ops-zone-items">
        {shown.map((zone) => (
          <ZoneListItem
            key={zone.id}
            zone={zone}
            selected={selected === zone.id}
            editable={editable}
            count={
              facilities.filter(
                (facility) => facilityZoneId(facility, zones) === zone.id,
              ).length
            }
            onSelect={() => setSelected(zone.id)}
            onEdit={() => onEdit(zone)}
            onAdd={() => {
              setSelected(zone.id);
              onAdd(zone.id);
            }}
          />
        ))}
        {!shown.length && (
          <p className="text-sm text-slate-500">
            No hay zonas para estos filtros.
          </p>
        )}
      </div>
    </div>
  );
}
