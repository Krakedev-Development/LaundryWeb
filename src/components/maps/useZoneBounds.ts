import { useEffect } from 'react';
import type { Map } from 'mapbox-gl';
import type { Zone } from '../../entities/zone/model/zone.types';

export function useZoneBounds(
  map: React.RefObject<Map | null>,
  ready: boolean,
  zones: Zone[],
  enabled?: boolean,
) {
  const key = zones.map((zone) => zone.id).join(',');
  useEffect(() => {
    if (!ready || !enabled || !zones.length || !map.current) return;
    const points = zones.flatMap((zone) =>
      zone.polygon.type === 'Polygon'
        ? zone.polygon.coordinates.flat()
        : zone.polygon.coordinates.flat(2),
    );
    const lngs = points.map((point) => point[0]),
      lats = points.map((point) => point[1]);
    map.current.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 45, maxZoom: 16, duration: 400 },
    );
  }, [map, ready, key, enabled]);
}
