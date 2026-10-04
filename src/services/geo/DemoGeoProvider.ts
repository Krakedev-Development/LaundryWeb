import { DEMO_ADDRESSES } from './demo';
import {
  toLngLat,
  type Coordinates,
  type GeoProvider,
  type MatrixPoint,
  type RouteOptions,
  type RouteSummary,
} from './geo.types';
// Explicit estimates for the demo, never presented as road routes or live ETA.
export class DemoGeoProvider implements GeoProvider {
  async searchAddress(query: string) {
    return DEMO_ADDRESSES.filter((a) =>
      `${a.label} ${a.formattedAddress}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    ).slice(0, 5);
  }
  async reverseGeocode(coordinates: Coordinates) {
    return {
      formattedAddress: 'Ubicación seleccionada en Samborondón, Ecuador',
      coordinates,
      persistence: 'user' as const,
    };
  }
  async getRoute(
    origin: Coordinates,
    destination: Coordinates,
    options: RouteOptions = {},
  ): Promise<RouteSummary> {
    const points = [origin, ...(options.waypoints ?? []), destination];
    const distanceMeters = points
      .slice(1)
      .reduce(
        (sum, p, i) =>
          sum +
          Math.hypot(
            (p.lat - points[i].lat) * 111000,
            (p.lng - points[i].lng) * 111000,
          ),
        0,
      );
    return {
      distanceMeters,
      durationSeconds: Math.max(60, distanceMeters / 8),
      geometry: { type: 'LineString', coordinates: points.map(toLngLat) },
      simulated: true,
    };
  }
  async getMatrix(origins: MatrixPoint[], destinations: MatrixPoint[]) {
    return Promise.all(
      origins.flatMap((origin) =>
        destinations.map(async (destination) => {
          const route = await this.getRoute(
            origin.coordinates,
            destination.coordinates,
          );
          return {
            originId: origin.id,
            destinationId: destination.id,
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
            reachable: true,
          };
        }),
      ),
    );
  }
}
