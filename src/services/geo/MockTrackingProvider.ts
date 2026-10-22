import { interpolateTrackingLocation } from './interpolateTrackingLocation';
import {
  toLngLat,
  type Coordinates,
  type DriverLocation,
  type RouteSummary,
  type TrackingProvider,
} from './geo.types';
interface Journey {
  route: RouteSummary;
  startedAt: number;
  pausedAt?: number;
  durationMs: number;
  listeners: Set<(location: DriverLocation) => void>;
  timer?: ReturnType<typeof setInterval>;
  last: DriverLocation;
}
export class MockTrackingProvider implements TrackingProvider {
  private journeys = new Map<string, Journey>();
  constructor(private intervalMs = 3000) {}
  start(driverId: string, route: RouteSummary, durationMs = 120000) {
    this.stop(driverId);
    const first = route.geometry.coordinates[0];
    const journey: Journey = {
      route,
      startedAt: Date.now(),
      durationMs,
      listeners: new Set(),
      last: {
        driverId,
        coordinates: { lng: first[0], lat: first[1] },
        updatedAt: new Date().toISOString(),
        simulated: true,
      },
    };
    this.journeys.set(driverId, journey);
    journey.timer = setInterval(() => {
      if (journey.pausedAt !== undefined) return;
      journey.last = this.locationAt(driverId, Date.now());
      journey.listeners.forEach((callback) => callback(journey.last));
      if (
        Date.now() - journey.startedAt >= journey.durationMs &&
        journey.timer
      ) {
        clearInterval(journey.timer);
        journey.timer = undefined;
      }
    }, this.intervalMs);
  }
  locationAt(driverId: string, now: number): DriverLocation {
    const journey = this.journeys.get(driverId);
    if (!journey) throw new Error('No existe un recorrido activo.');
    now = journey.pausedAt ?? now;
    return interpolateTrackingLocation(
      driverId,
      journey.route,
      journey.startedAt,
      journey.durationMs,
      now,
    );
  }
  subscribeToDriver(
    driverId: string,
    callback: (location: DriverLocation) => void,
  ) {
    const journey = this.journeys.get(driverId);
    if (!journey) return () => {};
    journey.listeners.add(callback);
    callback(journey.last);
    return () => {
      journey.listeners.delete(callback);
    };
  }
  pause(driverId: string) {
    const journey = this.journeys.get(driverId);
    if (journey && journey.pausedAt === undefined)
      journey.pausedAt = Date.now();
  }
  resume(driverId: string) {
    const journey = this.journeys.get(driverId);
    if (journey?.pausedAt !== undefined) {
      journey.startedAt += Date.now() - journey.pausedAt;
      journey.pausedAt = undefined;
    }
  }
  restart(driverId: string) {
    const journey = this.journeys.get(driverId);
    if (!journey) return;
    this.start(driverId, journey.route, journey.durationMs);
    const restarted = this.journeys.get(driverId)!;
    restarted.listeners = journey.listeners;
    restarted.listeners.forEach((listener) => listener(restarted.last));
  }
  stop(driverId: string) {
    const journey = this.journeys.get(driverId);
    if (journey?.timer) clearInterval(journey.timer);
    this.journeys.delete(driverId);
  }
  dispose() {
    this.journeys.forEach((_, id) => this.stop(id));
  }
}
export function demoTrackingRoute(
  origin: Coordinates,
  destination: Coordinates,
): RouteSummary {
  return {
    geometry: {
      type: 'LineString',
      coordinates: [toLngLat(origin), toLngLat(destination)],
    },
    distanceMeters: 0,
    durationSeconds: 120,
    simulated: true,
  };
}
