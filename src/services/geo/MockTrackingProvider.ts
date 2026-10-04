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
    const points = journey.route.geometry.coordinates;
    const lengths = points
      .slice(1)
      .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const total = lengths.reduce((sum, value) => sum + value, 0);
    let remaining =
      total *
      Math.min(1, Math.max(0, (now - journey.startedAt) / journey.durationMs));
    let segment = 0;
    while (segment < lengths.length - 1 && remaining > lengths[segment]) {
      remaining -= lengths[segment];
      segment++;
    }
    const a = points[segment],
      b = points[Math.min(segment + 1, points.length - 1)];
    const progress = lengths[segment] ? remaining / lengths[segment] : 0;
    return {
      driverId,
      coordinates: {
        lng: a[0] + (b[0] - a[0]) * progress,
        lat: a[1] + (b[1] - a[1]) * progress,
      },
      updatedAt: new Date(now).toISOString(),
      etaSeconds: Math.max(
        0,
        Math.ceil((journey.durationMs - (now - journey.startedAt)) / 1000),
      ),
      simulated: true,
    };
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
