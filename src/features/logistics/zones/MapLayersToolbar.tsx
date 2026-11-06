import React from 'react';
import {
  Building2,
  Truck,
  Package,
  ArrowUpRight,
  CircleAlert,
  Layers3,
  MapPinned,
  Moon,
  Sun,
} from 'lucide-react';
import type { Zone } from '../../../entities/zone/model/zone.types';
import { useMapTheme } from '../../../components/maps/mapPointAppearance';

const layerItems = {
  facility: { label: 'Sedes', icon: Building2 },
  driver: { label: 'Choferes', icon: Truck },
  pickup: { label: 'Recogidas', icon: Package },
  delivery: { label: 'Entregas', icon: ArrowUpRight },
  incident: { label: 'Incidencias', icon: CircleAlert },
};
type Layers = Record<keyof typeof layerItems, boolean>;
export function MapLayersToolbar({
  layers,
  onLayersChange,
  zones,
  zone,
  onZoneChange,
  showZones,
  onShowZonesChange,
}: {
  layers: Layers;
  onLayersChange(layers: Layers): void;
  zones: Zone[];
  zone: string;
  onZoneChange(zone: string): void;
  showZones: boolean;
  onShowZonesChange(value: boolean): void;
}) {
  const [theme, setTheme] = useMapTheme();
  return (
    <section className="ops-panel" aria-label="Filtros del mapa">
      <div className="ops-panel-header">
        <div className="ops-panel-title">
          <span className="ops-icon">
            <Layers3 />
          </span>
          <div>
            <h2 className="ops-heading">Vista operativa</h2>
            <p className="ops-caption">
              Selecciona la zona, capas operativas y modo cartográfico.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 w-full sm:w-auto">
          <div
            role="group"
            aria-label="Modo de capa cartográfica"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1"
          >
            <button
              type="button"
              onClick={() => setTheme('tactical')}
              aria-pressed={theme === 'tactical'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                theme === 'tactical'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="size-3.5 text-sky-400" aria-hidden="true" />
              <span>Modo Táctico</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-[#0F4C81] shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="size-3.5 text-amber-500" aria-hidden="true" />
              <span>Modo Claro</span>
            </button>
          </div>
          <label className="ops-label w-full sm:w-60">
            Zona de operación
            <select
              aria-label="Zona"
              value={zone}
              onChange={(event) => onZoneChange(event.target.value)}
              className="ops-field"
            >
              <option value="">Todas las zonas</option>
              {zones.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="ops-layer-row">
        {(Object.keys(layers) as (keyof Layers)[]).map((key) => {
          const Icon = layerItems[key].icon;
          return (
            <label key={key} className="ops-layer">
              <input
                type="checkbox"
                className="ops-check"
                checked={layers[key]}
                onChange={(event) =>
                  onLayersChange({ ...layers, [key]: event.target.checked })
                }
              />
              <Icon aria-hidden="true" />
              {layerItems[key].label}
            </label>
          );
        })}
        <label className="ops-check-label w-full pt-2 sm:ml-auto sm:w-auto sm:pt-0">
          <MapPinned size={15} className="text-slate-400" aria-hidden="true" />
          <input
            type="checkbox"
            className="ops-check"
            checked={showZones}
            onChange={(event) => onShowZonesChange(event.target.checked)}
          />
          Mostrar zonas
        </label>
      </div>
    </section>
  );
}
