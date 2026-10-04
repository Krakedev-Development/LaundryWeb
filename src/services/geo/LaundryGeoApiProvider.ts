import {
  GeoError,
  type GeoProvider,
  type GeoAddress,
  type Coordinates,
  type RouteSummary,
  type MatrixPoint,
  type MatrixResult,
  type AddressSearchOptions,
  type GeoRequestOptions,
  type RouteOptions,
} from './geo.types';
export class LaundryGeoApiProvider implements GeoProvider {
  constructor(private baseUrl: string) {}
  private async post<T>(
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    if (!this.baseUrl)
      throw new GeoError(
        'BACKEND_UNAVAILABLE',
        'El servicio geográfico todavía no está configurado.',
      );
    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/geo/${path}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      },
    );
    if (!response.ok)
      throw new GeoError(
        'NETWORK',
        'El servicio geográfico no está disponible.',
      );
    return response.json() as Promise<T>;
  }
  searchAddress(query: string, options: AddressSearchOptions = {}) {
    const { signal, ...rest } = options;
    return this.post<GeoAddress[]>('search', { query, ...rest }, signal);
  }
  reverseGeocode(coordinates: Coordinates, options: GeoRequestOptions = {}) {
    return this.post<GeoAddress | null>(
      'reverse',
      { coordinates, permanent: options.permanent },
      options.signal,
    );
  }
  getRoute(
    origin: Coordinates,
    destination: Coordinates,
    options: RouteOptions = {},
  ) {
    const { signal, ...rest } = options;
    return this.post<RouteSummary | null>(
      'route',
      { origin, destination, ...rest },
      signal,
    );
  }
  getMatrix(
    origins: MatrixPoint[],
    destinations: MatrixPoint[],
    options: RouteOptions = {},
  ) {
    const { signal, ...rest } = options;
    return this.post<MatrixResult[]>(
      'matrix',
      { origins, destinations, ...rest },
      signal,
    );
  }
}
