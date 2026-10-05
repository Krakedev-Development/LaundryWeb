import {
  toLngLat,
  type Coordinates,
  type GeoProvider,
  type RouteOptions,
  type RouteSummary,
} from './geo.types';
export function routeCacheKey(
  origin: Coordinates,
  destination: Coordinates,
  options: RouteOptions = {},
) {
  return JSON.stringify({
    points: [origin, ...(options.waypoints ?? []), destination].map(toLngLat),
    profile: options.profile ?? 'driving',
  });
}
export class RoutingService {
  private cache = new Map<
    string,
    { expiresAt: number; route: RouteSummary | null }
  >();
  constructor(
    private provider: GeoProvider,
    private ttlMs = 300000,
    private maxEntries = 100,
  ) {}
  async getRoute(
    origin: Coordinates,
    destination: Coordinates,
    options: RouteOptions = {},
  ) {
    const key = routeCacheKey(origin, destination, options);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.route;
    const route = await this.provider.getRoute(origin, destination, options);
    if (!options.signal?.aborted) {
      if (this.cache.size >= this.maxEntries)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { route, expiresAt: Date.now() + this.ttlMs });
    }
    return route;
  }
}
