import type { Coordinates, GeoProvider } from './geo.types';
export interface CustomerFacility {
  id: string;
  coordinates: Coordinates;
  active?: boolean;
  status?: string;
  acceptsCustomerDropoff?: boolean;
  allowsCustomerPickup?: boolean;
  serviceIds?: string[];
}
export class FacilityDiscoveryService {
  constructor(private provider: GeoProvider) {}
  eligible<T extends CustomerFacility>(
    facilities: T[],
    serviceIds: string[] = [],
  ): T[] {
    return facilities.filter(
      (f) =>
        f.active !== false &&
        (!f.status || f.status === 'ACTIVE') &&
        f.allowsCustomerPickup !== false &&
        serviceIds.every(
          (id) =>
            !f.serviceIds ||
            f.serviceIds.includes('*') ||
            f.serviceIds.includes(id),
        ),
    );
  }
  async rank<T extends CustomerFacility>(
    facilities: T[],
    origin: Coordinates,
    serviceIds: string[] = [],
    signal?: AbortSignal,
  ) {
    const eligible = this.eligible(facilities, serviceIds);
    if (!eligible.length) return [];
    const matrix = await this.provider.getMatrix(
      [{ id: 'CUSTOMER', coordinates: origin }],
      eligible.map((f) => ({ id: f.id, coordinates: f.coordinates })),
      { signal },
    );
    return eligible
      .map((f) => {
        const row = matrix.find(
          (r) => r.destinationId === f.id && r.originId === 'CUSTOMER',
        );
        return {
          facility: f,
          durationSeconds: row?.reachable ? row.durationSeconds : null,
          distanceMeters: row?.reachable ? row.distanceMeters : null,
        };
      })
      .sort(
        (a, b) =>
          (a.durationSeconds ?? Infinity) - (b.durationSeconds ?? Infinity) ||
          a.facility.id.localeCompare(b.facility.id),
      );
  }
}
