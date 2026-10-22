import React from 'react';
import { Building2, Check, MapPin, Pencil } from 'lucide-react';
import type { Zone } from '../../../entities/zone/model/zone.types';

export function ZoneListItem({
  zone,
  count,
  selected,
  editable,
  onSelect,
  onEdit,
  onAdd,
}: {
  zone: Zone;
  count: number;
  selected: boolean;
  editable: boolean;
  onSelect(): void;
  onEdit(): void;
  onAdd(): void;
}) {
  return (
    <article
      className={`ops-zone-card ${selected ? 'ops-zone-card-selected' : ''}`}
    >
      <button
        type="button"
        className="ops-zone-select"
        aria-pressed={selected}
        onClick={onSelect}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-xs font-bold leading-relaxed text-slate-800">
            {zone.name}
          </span>
          {selected && (
            <Check
              size={14}
              className="shrink-0 text-sky-700"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`ops-badge ${zone.active ? 'ops-badge-active' : ''}`}
          >
            <span
              className={`size-1.5 rounded-full ${zone.active ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            {zone.active ? 'Activa' : 'Inactiva'}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <Building2 size={12} aria-hidden="true" />
            {count} {count === 1 ? 'sede' : 'sedes'}
          </span>
        </div>
      </button>
      {editable && (
        <div className="ops-zone-actions">
          <button
            type="button"
            aria-label={`Editar ${zone.name}`}
            onClick={onEdit}
            className="ops-button ops-button-ghost ops-button-compact"
          >
            <Pencil />
            Editar
          </button>
          {zone.active && (
            <button
              type="button"
              onClick={onAdd}
              className="ops-button ops-button-soft ops-button-compact ml-auto"
            >
              <MapPin />
              Agregar sede
            </button>
          )}
        </div>
      )}
    </article>
  );
}
