import type { Facility, Order } from '../../../types';
import type { Zone } from './zone.types';
import { facilityZoneId } from './zone.rules';

export function validateFacilityRelocation(
  previous: Facility,
  next: Facility,
  zones: Zone[],
  orders: Order[],
) {
  const changed =
    previous.coordinates.lat !== next.coordinates.lat ||
    previous.coordinates.lng !== next.coordinates.lng ||
    facilityZoneId(previous, zones) !== facilityZoneId(next, zones);
  if (!changed) return;
  if (
    orders.some(
      (order) =>
        order.facilityId === previous.id &&
        !['COMPLETED', 'CLOSED', 'DELIVERED', 'CANCELLED'].includes(
          order.status,
        ),
    )
  )
    throw Error(
      'La sede tiene solicitudes en curso. Conserva su ubicación hasta finalizarlas.',
    );
  if (
    zones.some(
      (zone) =>
        zone.facilityId === previous.id &&
        zone.id !== facilityZoneId(next, zones),
    )
  )
    throw Error(
      'La sede mantiene la cobertura de su zona. Conserva la zona asignada.',
    );
}
