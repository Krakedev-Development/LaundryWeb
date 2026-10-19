import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { MapPoint } from '../../../components/maps/BaseMap';
import { driverStates } from '../../../components/maps/mapPointAppearance';
import { locationKinds } from './mapLocationPresentation';

export function LocationTableRow({
  point,
  onOpen,
}: {
  point: MapPoint;
  onOpen(id: string): void;
}) {
  const kind = locationKinds[point.kind],
    Icon = kind.icon;
  const driverState =
    point.kind === 'driver'
      ? driverStates[point.status as keyof typeof driverStates]
      : undefined;
  return (
    <tr>
      <td>
        <span className="inline-flex items-center gap-2 whitespace-nowrap font-semibold text-slate-600">
          <Icon size={15} className="text-sky-700" aria-hidden="true" />
          {kind.label}
        </span>
      </td>
      <th scope="row">
        <span className="block font-bold text-slate-800">{point.label}</span>
        <span className="mt-1 block font-mono text-[10px] font-normal text-slate-400">
          {point.id}
        </span>
      </th>
      <td className="ops-location-detail">
        {point.detail || 'Sin información adicional'}
      </td>
      <td>
        {driverState ? (
          <span className="ops-badge">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: driverState.color }}
            />
            {driverState.label}
          </span>
        ) : (
          <span className="text-slate-400">No aplica</span>
        )}
      </td>
      <td>
        {point.kind === 'driver' ? (
          <span
            className={`ops-badge ${point.stale ? 'border-amber-200 bg-amber-50 text-amber-700' : 'ops-badge-active'}`}
          >
            {point.stale ? 'Desactualizada' : 'Reciente'}
          </span>
        ) : (
          <span className="text-slate-400">No aplica</span>
        )}
      </td>
      <td className="text-right">
        <button
          type="button"
          onClick={() => onOpen(point.id)}
          aria-label={`Ver detalle de ${point.label}`}
          className="ops-button ops-button-soft ops-button-compact whitespace-nowrap"
        >
          Ver detalle
          <ArrowUpRight aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}
