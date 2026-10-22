import type { DriverLocation, RouteSummary } from './geo.types';
export function interpolateTrackingLocation(
  driverId: string,
  route: RouteSummary,
  startedAt: number,
  durationMs: number,
  now: number,
): DriverLocation {
  const points = route.geometry.coordinates;
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  let remaining =
    total * Math.min(1, Math.max(0, (now - startedAt) / durationMs));
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
    etaSeconds: Math.max(0, Math.ceil((durationMs - (now - startedAt)) / 1000)),
    simulated: true,
  };
}
