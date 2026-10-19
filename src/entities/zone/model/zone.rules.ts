import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { Zone } from './zone.types';
import type { Coordinates } from '../../../services/geo/geo.types';
import type { Facility, Order } from '../../../types';
import { validateRing } from './polygonGeometry';

export function zoneContains(zone: Zone, point: Coordinates) {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    booleanPointInPolygon([point.lng, point.lat], zone.polygon, {
      ignoreBoundary: false,
    })
  );
}

export function facilityZoneId(facility: Partial<Facility>, zones: Zone[]) {
  return (
    facility.zoneId ?? zones.find((zone) => zone.facilityId === facility.id)?.id
  );
}

export function validateZone(zone: Zone) {
  if (
    typeof zone.id !== 'string' ||
    typeof zone.name !== 'string' ||
    typeof zone.active !== 'boolean'
  )
    throw Error('Revisa el nombre, identificador y estado de la zona.');
  if (!zone.id || !zone.name.trim())
    throw Error('Escribe el nombre de la zona.');
  const polygons =
    zone.polygon?.type === 'Polygon'
      ? [zone.polygon.coordinates]
      : zone.polygon?.type === 'MultiPolygon'
        ? zone.polygon.coordinates
        : [];
  if (!polygons.length || polygons.some((polygon) => polygon.length !== 1))
    throw Error('Dibuja un límite exterior válido para la zona.');
  polygons.forEach((polygon) => validateRing(polygon[0]));
}

export function validateZoneChange(
  previous: Zone,
  next: Zone,
  facilities: Facility[],
  orders: Order[],
) {
  const changed =
    JSON.stringify(previous.polygon) !== JSON.stringify(next.polygon);
  if (!changed && previous.active === next.active) return;
  if (
    orders.some(
      (order) =>
        order.zoneId === previous.id &&
        !['COMPLETED', 'CLOSED', 'DELIVERED', 'CANCELLED'].includes(
          order.status,
        ),
    )
  )
    throw Error(
      'La zona tiene solicitudes en curso. Conserva sus límites y estado hasta finalizarlas.',
    );
  const linked = facilities.filter(
    (facility) => facilityZoneId(facility, [previous]) === previous.id,
  );
  if (
    changed &&
    linked.some((facility) => !zoneContains(next, facility.coordinates))
  )
    throw Error('El nuevo límite dejaría sedes fuera de su zona.');
  if (!next.active && linked.some((facility) => facility.status === 'ACTIVE'))
    throw Error(
      'La zona contiene sedes operativas. Ponlas en mantenimiento antes de desactivarla.',
    );
}

export function validatePinnedFacility(
  facility: Partial<Facility>,
  zones: Zone[],
) {
  if (!facility.zoneId) return;
  const zone = zones.find((zone) => zone.id === facility.zoneId);
  if (
    !zone ||
    !facility.coordinates ||
    !zoneContains(zone, facility.coordinates)
  )
    throw Error('Ubica el pin de la sede dentro de la zona seleccionada.');
  if (!zone.active && facility.status !== 'MAINTENANCE')
    throw Error('Activa la zona antes de registrar una sede operativa.');
}
