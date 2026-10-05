import type { LineString, Polygon, MultiPolygon } from 'geojson';

// Domain coordinates retain the representation already used by both applications.
export interface Coordinates {
  lat: number;
  lng: number;
}
export interface GeoAddress {
  id?: string;
  label?: string;
  formattedAddress: string;
  coordinates: Coordinates;
  city?: string;
  region?: string;
  country?: string;
  instructions?: string;
  providerPlaceId?: string;
  persistence: 'permanent' | 'user' | 'demo' | 'temporary';
}
export interface RouteSummary {
  distanceMeters: number;
  durationSeconds: number;
  geometry: LineString;
  simulated?: boolean;
}
export interface MatrixPoint {
  id: string;
  coordinates: Coordinates;
}
export interface MatrixResult {
  originId: string;
  destinationId: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  reachable: boolean;
}
export interface GeoRequestOptions {
  signal?: AbortSignal;
  permanent?: boolean;
}
export interface AddressSearchOptions extends GeoRequestOptions {
  country?: string;
  language?: string;
  proximity?: Coordinates;
  limit?: number;
}
export interface RouteOptions extends GeoRequestOptions {
  profile?: 'driving' | 'driving-traffic';
  waypoints?: Coordinates[];
}
export interface GeoProvider {
  searchAddress(
    query: string,
    options?: AddressSearchOptions,
  ): Promise<GeoAddress[]>;
  reverseGeocode(
    coordinates: Coordinates,
    options?: GeoRequestOptions,
  ): Promise<GeoAddress | null>;
  getRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: RouteOptions,
  ): Promise<RouteSummary | null>;
  getMatrix(
    origins: MatrixPoint[],
    destinations: MatrixPoint[],
    options?: RouteOptions,
  ): Promise<MatrixResult[]>;
}
export interface ServiceArea {
  id: string;
  name: string;
  facilityId: string;
  polygon: Polygon | MultiPolygon;
  active: boolean;
}
export interface DriverLocation {
  driverId: string;
  coordinates: Coordinates;
  updatedAt: string;
  accuracy?: number;
  etaSeconds?: number;
  heading?: number;
  speed?: number;
  simulated?: boolean;
}
export interface TrackingProvider {
  subscribeToDriver(
    driverId: string,
    callback: (location: DriverLocation) => void,
  ): () => void;
}
export interface DriverLocationPublisher {
  start(driverId: string): Promise<void>;
  stop(): Promise<void>;
  publish(location: DriverLocation): Promise<void>;
}
// Future contract: ordering stops belongs to a separate optimization provider.
export interface RouteOptimizer {
  optimize(
    stops: MatrixPoint[],
    options?: RouteOptions,
  ): Promise<MatrixPoint[]>;
}
export type GeoErrorCode =
  | 'TOKEN_MISSING'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'INVALID'
  | 'BACKEND_UNAVAILABLE'
  | 'PERSISTENCE_DISABLED';
export class GeoError extends Error {
  constructor(
    public code: GeoErrorCode,
    message: string,
    public retryAfterSeconds = 0,
  ) {
    super(message);
    this.name = 'GeoError';
  }
}
export const validCoordinates = (p: Coordinates) =>
  Number.isFinite(p.lat) &&
  Number.isFinite(p.lng) &&
  Math.abs(p.lat) <= 90 &&
  Math.abs(p.lng) <= 180;
export const toLngLat = (p: Coordinates): [number, number] => [p.lng, p.lat];
