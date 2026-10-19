import { mapSymbols, pointColor } from './mapPointAppearance';
import React from 'react';
import type { MapPoint } from './BaseMap';
import type { Coordinates } from '../../services/geo/geo.types';
import type { ZoneMapOptions } from './zoneMap.types';
export function CoordinateMarkers({
  points,
  vertices,
  projection,
  onSelect,
  onVertexMove,
  onClosePolygon,
  setDrag,
}: {
  points: MapPoint[];
  vertices: Coordinates[];
  projection: { project(point: Coordinates): number[] };
  onSelect?: (id: string) => void;
  setDrag(index: number): void;
} & ZoneMapOptions) {
  return (
    <>
      {points.map((point) => {
        const [cx, cy] = projection.project(point.coordinates);
        return (
          <g
            key={point.kind + point.id}
            role="button"
            tabIndex={0}
            aria-label={point.label}
            onClick={() => onSelect?.(point.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSelect?.(point.id);
            }}
          >
            <circle
              cx={cx}
              cy={cy}
              r="15"
              fill={pointColor(point)}
              opacity={point.stale ? 0.45 : 1}
            />
            <text
              x={cx}
              y={cy + 5}
              textAnchor="middle"
              fill="white"
              fontSize="14"
            >
              {mapSymbols[point.kind]}
            </text>
            <title>{point.label}</title>
          </g>
        );
      })}
      {vertices.map((point, index) => {
        const [cx, cy] = projection.project(point);
        return (
          <g
            key={index}
            role="button"
            tabIndex={0}
            aria-label={`Vértice ${index + 1}`}
            onPointerDown={(event) => {
              if (onVertexMove) {
                setDrag(index);
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onClick={() => {
              if (!index) onClosePolygon?.();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !index) onClosePolygon?.();
            }}
          >
            <circle
              cx={cx}
              cy={cy}
              r="12"
              fill="white"
              stroke="#0284C7"
              strokeWidth="3"
            />
            <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13">
              {index + 1}
            </text>
          </g>
        );
      })}
    </>
  );
}
