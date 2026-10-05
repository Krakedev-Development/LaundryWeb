import {
  GeoError,
  toLngLat,
  validCoordinates,
  type Coordinates,
  type GeoAddress,
  type GeoProvider,
  type AddressSearchOptions,
  type GeoRequestOptions,
  type RouteOptions,
  type RouteSummary,
  type MatrixPoint,
  type MatrixResult,
} from '../geo.types';

interface Feature {
  id?: string;
  geometry: { coordinates: number[] };
  properties: {
    mapbox_id?: string;
    full_address?: string;
    name?: string;
    place_formatted?: string;
    context?: {
      place?: { name?: string };
      region?: { name?: string };
      country?: { country_code?: string };
    };
  };
}
interface GeocodingResponse {
  features: Feature[];
}
interface DirectionsResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: RouteSummary['geometry'];
  }[];
}
interface MatrixResponse {
  code: string;
  durations?: (number | null)[][];
  distances?: (number | null)[][];
}
export interface MapboxConfig {
  accessToken: string;
  country: string;
  language: string;
  permanentGeocoding: boolean;
  timeoutMs?: number;
}
export function mapMapboxFeatureToGeoAddress(
  feature: Feature,
  permanent = false,
): GeoAddress {
  const p = feature.properties;
  return {
    providerPlaceId: p.mapbox_id ?? feature.id,
    label: p.name,
    formattedAddress:
      p.full_address ?? [p.name, p.place_formatted].filter(Boolean).join(', '),
    coordinates: {
      lng: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1],
    },
    city: p.context?.place?.name,
    region: p.context?.region?.name,
    country: p.context?.country?.country_code,
    persistence: permanent ? 'permanent' : 'temporary',
  };
}
export function mapMapboxRouteToRouteSummary(
  route: NonNullable<DirectionsResponse['routes']>[number],
): RouteSummary {
  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry,
  };
}
export function mapMapboxMatrixToMatrixResults(
  data: MatrixResponse,
  origins: MatrixPoint[],
  destinations: MatrixPoint[],
): MatrixResult[] {
  return origins.flatMap((origin, i) =>
    destinations.map((destination, j) => {
      const durationSeconds = data.durations?.[i]?.[j] ?? null;
      const distanceMeters = data.distances?.[i]?.[j] ?? null;
      return {
        originId: origin.id,
        destinationId: destination.id,
        durationSeconds,
        distanceMeters,
        reachable: durationSeconds !== null && distanceMeters !== null,
      };
    }),
  );
}
export class MapboxGeoProvider implements GeoProvider {
  private blockedUntil = 0;
  constructor(
    private config: MapboxConfig,
    private fetcher: typeof fetch = fetch,
  ) {}
  private async request<T>(
    path: string,
    params: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    if (!this.config.accessToken.startsWith('pk.'))
      throw new GeoError(
        'TOKEN_MISSING',
        'El mapa todavía no está configurado.',
      );
    if (Date.now() < this.blockedUntil)
      throw new GeoError(
        'RATE_LIMIT',
        'Espera unos segundos antes de volver a intentar.',
        Math.ceil((this.blockedUntil - Date.now()) / 1000),
      );
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.config.timeoutMs ?? 12000);
    try {
      const query = new URLSearchParams({
        ...params,
        access_token: this.config.accessToken,
      });
      const response = await this.fetcher(
        `https://api.mapbox.com/${path}?${query}`,
        { signal: controller.signal },
      );
      if (response.status === 429) {
        const header = response.headers.get('retry-after');
        const seconds =
          header && Number.isFinite(Number(header))
            ? Number(header)
            : Math.max(
                0,
                ((header ? Date.parse(header) : NaN) - Date.now()) / 1000,
              );
        const delay = Number.isFinite(seconds) ? Math.max(5, seconds) : 30;
        this.blockedUntil = Date.now() + delay * 1000;
        throw new GeoError(
          'RATE_LIMIT',
          'El servicio de mapas está ocupado. Intenta de nuevo en unos segundos.',
          delay,
        );
      }
      if (response.status === 401 || response.status === 403)
        throw new GeoError(
          'UNAUTHORIZED',
          'No pudimos autorizar el servicio de mapas.',
        );
      if (!response.ok)
        throw new GeoError(
          response.status >= 500 ? 'NETWORK' : 'INVALID',
          'No pudimos consultar el servicio de mapas.',
        );
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof GeoError) throw error;
      if (signal?.aborted) throw error;
      throw new GeoError(
        timedOut ? 'TIMEOUT' : 'NETWORK',
        timedOut
          ? 'La consulta tardó demasiado. Intenta de nuevo.'
          : 'Sin conexión con el servicio de mapas.',
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  private persistence(options?: GeoRequestOptions) {
    if (options?.permanent && !this.config.permanentGeocoding)
      throw new GeoError(
        'PERSISTENCE_DISABLED',
        'La búsqueda para direcciones guardadas todavía no está habilitada. Puedes indicar tu dirección y confirmar el pin.',
      );
    return options?.permanent ?? false;
  }
  async searchAddress(query: string, options: AddressSearchOptions = {}) {
    if (query.trim().length < 3) return [];
    const permanent = this.persistence(options);
    const data = await this.request<GeocodingResponse>(
      'search/geocode/v6/forward',
      {
        q: query.trim(),
        country: options.country ?? this.config.country,
        language: options.language ?? this.config.language,
        limit: String(Math.min(5, options.limit ?? 5)),
        autocomplete: 'true',
        permanent: String(permanent),
        ...(options.proximity
          ? { proximity: toLngLat(options.proximity).join(',') }
          : {}),
      },
      options.signal,
    );
    return data.features.map((f) => mapMapboxFeatureToGeoAddress(f, permanent));
  }
  async reverseGeocode(
    coordinates: Coordinates,
    options: GeoRequestOptions = {},
  ) {
    const permanent = this.persistence(options);
    if (!validCoordinates(coordinates))
      throw new GeoError('INVALID', 'Ubicación inválida.');
    const data = await this.request<GeocodingResponse>(
      'search/geocode/v6/reverse',
      {
        longitude: String(coordinates.lng),
        latitude: String(coordinates.lat),
        language: this.config.language,
        permanent: String(permanent),
      },
      options.signal,
    );
    return data.features[0]
      ? mapMapboxFeatureToGeoAddress(data.features[0], permanent)
      : null;
  }
  async getRoute(
    origin: Coordinates,
    destination: Coordinates,
    options: RouteOptions = {},
  ) {
    const points = [origin, ...(options.waypoints ?? []), destination];
    if (points.some((p) => !validCoordinates(p)))
      throw new GeoError('INVALID', 'Ubicación inválida.');
    if (points.length > 25)
      throw new GeoError('INVALID', 'La ruta tiene demasiadas paradas.');
    const data = await this.request<DirectionsResponse>(
      `directions/v5/mapbox/${options.profile ?? 'driving'}/${points.map((p) => toLngLat(p).join(',')).join(';')}`,
      { geometries: 'geojson', overview: 'full', steps: 'false' },
      options.signal,
    );
    if (data.code === 'NoRoute' || !data.routes?.length) return null;
    if (data.code !== 'Ok')
      throw new GeoError('INVALID', 'No pudimos calcular la ruta.');
    return mapMapboxRouteToRouteSummary(data.routes[0]);
  }
  async getMatrix(
    origins: MatrixPoint[],
    destinations: MatrixPoint[],
    options: RouteOptions = {},
  ): Promise<MatrixResult[]> {
    if (!origins.length || !destinations.length) return [];
    if (origins.length === 1 && destinations.length === 1) {
      const route = await this.getRoute(
        origins[0].coordinates,
        destinations[0].coordinates,
        options,
      );
      return [
        {
          originId: origins[0].id,
          destinationId: destinations[0].id,
          distanceMeters: route?.distanceMeters ?? null,
          durationSeconds: route?.durationSeconds ?? null,
          reachable: !!route,
        },
      ];
    }
    const limit = options.profile === 'driving-traffic' ? 10 : 25;
    if (destinations.length >= limit)
      throw new GeoError(
        'INVALID',
        'Demasiados destinos para comparar choferes.',
      );
    const results: MatrixResult[] = [];
    for (
      let offset = 0;
      offset < origins.length;
      offset += limit - destinations.length
    ) {
      const batch = origins.slice(offset, offset + limit - destinations.length);
      if (batch.length * destinations.length === 1) {
        results.push(...(await this.getMatrix(batch, destinations, options)));
        continue;
      }
      const points = [...batch, ...destinations];
      if (points.some((p) => !validCoordinates(p.coordinates)))
        throw new GeoError('INVALID', 'Ubicación inválida.');
      const data = await this.request<MatrixResponse>(
        `directions-matrix/v1/mapbox/${options.profile ?? 'driving'}/${points.map((p) => toLngLat(p.coordinates).join(',')).join(';')}`,
        {
          sources: batch.map((_, i) => i).join(';'),
          destinations: destinations.map((_, i) => i + batch.length).join(';'),
          annotations: 'duration,distance',
        },
        options.signal,
      );
      if (data.code !== 'Ok' && data.code !== 'NoRoute')
        throw new GeoError('INVALID', 'No pudimos comparar los choferes.');
      results.push(
        ...mapMapboxMatrixToMatrixResults(data, batch, destinations),
      );
    }
    return results;
  }
}
