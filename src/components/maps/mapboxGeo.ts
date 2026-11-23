import type { Feature, Polygon } from 'geojson';
import type { Zone } from '../../entities/zone/model/zone.types';
import type { Coordinates } from '../../services/geo/geo.types';
import { DEFAULT_MAP_CENTER } from '../../config/mapbox';

/** Convierte `Coordinates[]` (`{lat, lng}`) a anillo cerrado GeoJSON `[lng, lat][]`. */
export function toLngLatRing(points: Coordinates[]): [number, number][] {
  if (points.length === 0) return [];
  const ring: [number, number][] = points.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length >= 3 && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

/** Convierte un anillo GeoJSON `[lng, lat][]` a vértices abiertos `{lat, lng}[]`. */
export function ringToCoordinates(ring: number[][]): Coordinates[] {
  if (!ring.length) return [];
  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed =
    ring.length > 3 && first[0] === last[0] && first[1] === last[1];
  const open = isClosed ? ring.slice(0, -1) : ring;
  return open.map(([lng, lat]) => ({
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  }));
}

export function zoneRingLngLat(zone: Zone): [number, number][] {
  if (zone.polygon.type === 'Polygon') {
    return (zone.polygon.coordinates[0] ?? []) as [number, number][];
  }
  return (zone.polygon.coordinates[0]?.[0] ?? []) as [number, number][];
}

export function zoneToPolygonFeature(
  zone: Zone,
  properties: Record<string, unknown> = {},
): Feature<Polygon> | null {
  const ring = zoneRingLngLat(zone);
  if (ring.length < 4) return null;
  return {
    type: 'Feature',
    id: zone.id,
    properties: {
      id: zone.id,
      name: zone.name,
      active: zone.active,
      ...properties,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

export function getZonesCenter(zones: Zone[]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  let count = 0;
  for (const zone of zones) {
    for (const [lng, lat] of zoneRingLngLat(zone)) {
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        sumLng += lng;
        sumLat += lat;
        count += 1;
      }
    }
  }
  if (count === 0) return DEFAULT_MAP_CENTER;
  return [sumLng / count, sumLat / count];
}
