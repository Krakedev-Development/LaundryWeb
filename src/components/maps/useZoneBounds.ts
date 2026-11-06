import { useEffect } from 'react';
import type L from 'leaflet';
import type { Zone } from '../../entities/zone/model/zone.types';

export function useZoneBounds(
  map: React.RefObject<L.Map | null>,
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
    if (!points.length) return;
    const lngs = points.map((point) => point[0]);
    const lats = points.map((point) => point[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    if (
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLat) ||
      !Number.isFinite(minLng) ||
      !Number.isFinite(maxLng)
    ) {
      return;
    }
    map.current.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { padding: [24, 24], maxZoom: 15, animate: true },
    );
  }, [map, ready, key, enabled]);
}
