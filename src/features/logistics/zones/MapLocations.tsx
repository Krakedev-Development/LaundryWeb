import React from 'react';
import { ListFilter, MapPin } from 'lucide-react';
import type { MapPoint } from '../../../components/maps/BaseMap';
import { useLocationTable } from './useLocationTable';
import { LocationTableFilters } from './LocationTableFilters';
import { LocationTableRow } from './LocationTableRow';
import { LocationTablePagination } from './LocationTablePagination';

export function MapLocations({
  points,
  onOpen,
}: {
  points: MapPoint[];
  onOpen(id: string): void;
}) {
  const table = useLocationTable(points);
  return (
    <section className="ops-panel" aria-label="Ubicaciones operativas">
      <div className="ops-panel-header">
        <div className="ops-panel-title">
          <span className="ops-icon">
            <ListFilter />
          </span>
          <div>
            <h2 className="ops-heading">Ubicaciones operativas</h2>
            <p className="ops-caption">
              Ubicaciones de la zona y las capas visibles del mapa, ordenadas
              por tipo y nombre.
            </p>
          </div>
        </div>
        <span className="ops-badge">
          {table.total} de {points.length} ubicaciones
        </span>
      </div>
      <LocationTableFilters table={table} />
      <div
        className="ops-location-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabla desplazable de ubicaciones"
      >
        <table
          className="ops-location-table"
          aria-label="Ubicaciones operativas"
        >
          <thead>
            <tr>
              {[
                'Tipo',
                'Nombre / referencia',
                'Dirección / información',
                'Estado del chofer',
                'Actualización GPS',
                'Acción',
              ].map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((point) => (
              <LocationTableRow
                key={point.kind + point.id}
                point={point}
                onOpen={onOpen}
              />
            ))}
            {!table.rows.length && (
              <tr>
                <td colSpan={6} className="!py-10 text-center">
                  <MapPin
                    className="mx-auto mb-3 size-6 text-slate-300"
                    aria-hidden="true"
                  />
                  <p className="font-semibold text-slate-600">
                    No hay ubicaciones para estos filtros.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Prueba otra búsqueda o ajusta los filtros de la tabla y del
                    mapa.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <LocationTablePagination table={table} />
    </section>
  );
}
