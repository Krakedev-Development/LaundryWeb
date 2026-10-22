import type { Coordinates } from '../../services/geo/geo.types';
import type { Zone } from '../../entities/zone/model/zone.types';
export function coordinateProjection(
  zones: Zone[],
  center: Coordinates,
  focus = false,
) {
  const points = zones.flatMap((zone) =>
    zone.polygon.type === 'Polygon'
      ? zone.polygon.coordinates.flat()
      : zone.polygon.coordinates.flat(2),
  );
  const lngs = points.map((point) => point[0]),
    lats = points.map((point) => point[1]);
  const west = points.length ? Math.min(...lngs) : center.lng - 0.03;
  const east = points.length ? Math.max(...lngs) : center.lng + 0.03;
  const south = points.length ? Math.min(...lats) : center.lat - 0.03;
  const north = points.length ? Math.max(...lats) : center.lat + 0.03;
  const dx = Math.max(east - west, 0.01) * 1.25,
    dy = Math.max(north - south, 0.01) * 1.25;
  const cx = focus ? center.lng : (west + east) / 2,
    cy = focus ? center.lat : (south + north) / 2;
  return {
    project: ({ lng, lat }: Coordinates) => [
      500 + ((lng - cx) / dx) * 1000,
      300 - ((lat - cy) / dy) * 600,
    ],
    unproject: (x: number, y: number) => ({
      lng: cx + ((x - 500) / 1000) * dx,
      lat: cy - ((y - 300) / 600) * dy,
    }),
  };
}
