import { ZoneList } from './ZoneList';
import React, { useState } from 'react';
import { Plus, MapPinned } from 'lucide-react';
import { useZones } from './useZones';
import { ZoneEditor } from './ZoneEditor';
import { FacilityLocationPicker } from './FacilityLocationPicker';
import { BaseMap } from '../../../components/maps/BaseMap';
import type { Zone } from '../../../entities/zone/model/zone.types';
import type { Coordinates } from '../../../services/geo/geo.types';
import type { Facility } from '../../../types';
import { facilityZoneId } from '../../../entities/zone/model/zone.rules';

export function ZonesPanel({
  facilities,
  editable,
  placing,
  onPlacingChange,
  onPick,
}: {
  facilities: Facility[];
  editable: boolean;
  placing: boolean;
  onPlacingChange(value: boolean): void;
  onPick(zone: Zone, point: Coordinates, address?: string): void;
}) {
  const { zones, error, save } = useZones();
  const [editor, setEditor] = useState<Zone | 'new' | null>(null);
  const [selected, setSelected] = useState('');
  const visible = zones.filter((zone) => !selected || zone.id === selected);
  return (
    <section className="ops-panel" aria-label="Zonas y sedes">
      <div className="ops-panel-header">
        <div className="ops-panel-title">
          <span className="ops-icon">
            <MapPinned />
          </span>
          <div>
            <h2 className="ops-heading">Zonas de operación</h2>
            <p className="ops-caption">
              Define el área y registra varias sedes dentro de cada zona.
            </p>
          </div>
        </div>
        {editable && (
          <button
            disabled={!!error}
            type="button"
            onClick={() => setEditor('new')}
            className="ops-button ops-button-primary"
          >
            <Plus size={16} />
            Crear zona
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="ops-zones-layout">
        <ZoneList
          zones={zones}
          facilities={facilities}
          editable={editable}
          selected={selected}
          setSelected={setSelected}
          onEdit={setEditor}
          onAdd={(id) => {
            setSelected(id);
            onPlacingChange(true);
          }}
        />
        <div className="ops-map-content">
          <div className="ops-map-title">
            <div>
              <p className="ops-eyebrow">Cobertura geográfica</p>
              <h3 className="mt-1 text-xs font-bold text-slate-700">
                {selected
                  ? zones.find((zone) => zone.id === selected)?.name
                  : 'Distribución de sedes'}
              </h3>
            </div>
            <span className="ops-badge ops-badge-selected">
              {visible.length} {visible.length === 1 ? 'zona' : 'zonas'}
            </span>
          </div>
          <BaseMap
            fitZones
            zones={visible}
            height={420}
            points={facilities
              .filter(
                (facility) =>
                  !selected || facilityZoneId(facility, zones) === selected,
              )
              .map((facility) => ({
                id: facility.id,
                label: facility.name,
                coordinates: facility.coordinates,
                kind: 'facility' as const,
              }))}
          />
        </div>
      </div>
      {editor && (
        <ZoneEditor
          initial={editor === 'new' ? undefined : editor}
          zones={zones}
          onClose={() => setEditor(null)}
          onSave={(zone) => {
            const saved = save(zone);
            setSelected(saved.id);
          }}
        />
      )}
      {placing && editable && !error && (
        <FacilityLocationPicker
          zones={zones}
          initialZone={selected || undefined}
          onClose={() => onPlacingChange(false)}
          onPick={(zone, point, address) => {
            onPlacingChange(false);
            onPick(zone, point, address);
          }}
        />
      )}
    </section>
  );
}
