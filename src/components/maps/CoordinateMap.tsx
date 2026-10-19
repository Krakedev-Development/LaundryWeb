import { CoordinateMarkers } from './CoordinateMarkers';
import React, { useMemo, useRef, useState } from 'react';
import type { MapPoint } from './BaseMap';
import type { Coordinates } from '../../services/geo/geo.types';
import type { ZoneMapOptions } from './zoneMap.types';
import { coordinateProjection } from './coordinateProjection';

interface Props extends ZoneMapOptions {
  points: MapPoint[];
  center: Coordinates;
  height: number;
  onPick?: (point: Coordinates) => void;
  onSelect?: (id: string) => void;
  followCenter?: boolean;
}
export function CoordinateMap({
  zones = [],
  vertices = [],
  points,
  center,
  height,
  onPick,
  onSelect,
  onVertexMove,
  onClosePolygon,
  followCenter,
}: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const zoneKey = zones.map((zone) => zone.id).join(',');
  const projection = useMemo(
    () => coordinateProjection(zones, center, followCenter),
    [zoneKey, center.lat, center.lng, followCenter],
  );
  const position = (event: React.MouseEvent) => {
    const rect = svg.current!.getBoundingClientRect();
    return projection.unproject(
      ((event.clientX - rect.left) / rect.width) * 1000,
      ((event.clientY - rect.top) / rect.height) * 600,
    );
  };
  const path = (coordinates: number[][]) =>
    coordinates
      .map(([lng, lat]) => projection.project({ lng, lat }).join(','))
      .join(' ');
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
      <p className="px-4 py-2 text-xs text-slate-600">
        Vista de coordenadas · mapa de calles no disponible
      </p>
      <svg
        ref={svg}
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
        style={{ height, width: '100%', touchAction: 'none' }}
        aria-label="Mapa de ubicaciones Laundry"
        role="img"
        onClick={(event) => {
          if (event.target === svg.current) onPick?.(position(event));
        }}
        onPointerMove={(event) => {
          if (drag !== null) onVertexMove?.(drag, position(event));
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        {zones.map((zone) => (
          <g key={zone.id}>
            {(zone.polygon.type === 'Polygon'
              ? [zone.polygon.coordinates]
              : zone.polygon.coordinates
            ).map((rings, index) => (
              <polygon
                key={index}
                points={path(rings[0])}
                fill={zone.active ? '#0284C7' : '#64748B'}
                fillOpacity=".10"
                stroke="#0F4C81"
                strokeWidth="2"
                strokeDasharray={zone.active ? undefined : '8 6'}
                onClick={(event) => onPick?.(position(event))}
              >
                <title>{zone.name}</title>
              </polygon>
            ))}
          </g>
        ))}
        <polyline
          points={vertices
            .map((point) => projection.project(point).join(','))
            .join(' ')}
          fill="none"
          stroke="#0284C7"
          strokeWidth="3"
          pointerEvents="none"
        />
        <CoordinateMarkers
          points={points}
          vertices={vertices}
          projection={projection}
          onSelect={onSelect}
          onVertexMove={onVertexMove}
          onClosePolygon={onClosePolygon}
          setDrag={setDrag}
        />
      </svg>
    </div>
  );
}
