import { apiRequest } from './apiConfig';
import { session } from '../auth/session';
import type { Zone } from '../../entities/zone/model/zone.types';
import type { Facility } from '../../types';
import type { Polygon } from 'geojson';

function unwrapList<T>(
  payload: T[] | { data?: T[]; items?: T[] } | null | undefined,
): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

// --- 1. ZONES (/zones) ---

export interface ZoneLatLngPoint {
  lat: number;
  lng: number;
}

export interface CreateZoneDto {
  name: string;
  polygon: Array<ZoneLatLngPoint>;
}

export interface UpdateZoneDto {
  name?: string;
  polygon?: Array<ZoneLatLngPoint>;
  active?: boolean;
}

export interface ZoneResponse {
  id: string;
  name: string;
  polygon:
    | Array<ZoneLatLngPoint>
    | { type: 'Polygon'; coordinates: number[][][] };
  active?: boolean;
  facilityId?: string | null;
  facilities?: Array<{ id: string; name?: string }>;
}

export async function getZones(): Promise<ZoneResponse[]> {
  const res = await apiRequest<
    ZoneResponse[] | { data?: ZoneResponse[]; items?: ZoneResponse[] }
  >('/zones', {
    method: 'GET',
    token: session.getToken(),
  });
  return unwrapList(res);
}

export async function createZone(data: CreateZoneDto): Promise<ZoneResponse> {
  return apiRequest<ZoneResponse>('/zones', {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

export async function updateZone(
  id: string,
  data: UpdateZoneDto,
): Promise<ZoneResponse> {
  return apiRequest<ZoneResponse>(`/zones/${id}`, {
    method: 'PATCH',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

// --- 2. FACILITIES (/facilities) ---

export interface CreateFacilityDto {
  zoneId: string;
  name: string;
  address: string;
  city?: string;
  taxId?: string;
  phone?: string;
  managerName?: string;
  openingHours?: Record<string, any>;
  latitude: number;
  longitude: number;
  dailyCapacity?: number;
}

export interface UpdateFacilityDto {
  zoneId?: string;
  name?: string;
  address?: string;
  city?: string;
  taxId?: string;
  phone?: string;
  managerName?: string;
  openingHours?: Record<string, any>;
  latitude?: number;
  longitude?: number;
  dailyCapacity?: number;
  active?: boolean;
}

export interface FacilityResponse {
  id: string;
  zoneId?: string | null;
  zone?: { id: string; name: string } | string | null;
  name: string;
  code?: string | null;
  taxId?: string | null;
  address: string;
  city?: string | null;
  phone?: string | null;
  managerName?: string | null;
  openingHours?: Record<string, any> | null;
  latitude: number | string;
  longitude: number | string;
  dailyCapacity?: number | string | null;
  currentLoadKgDay?: number | string | null;
  activeOrders?: number | null;
  assignedDriversCount?: number | null;
  active?: boolean;
}

export async function getFacilities(): Promise<FacilityResponse[]> {
  const res = await apiRequest<
    | FacilityResponse[]
    | { data?: FacilityResponse[]; items?: FacilityResponse[] }
  >('/facilities', {
    method: 'GET',
    token: session.getToken(),
  });
  return unwrapList(res);
}

export async function createFacility(
  data: CreateFacilityDto,
): Promise<FacilityResponse> {
  return apiRequest<FacilityResponse>('/facilities', {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

export async function updateFacility(
  id: string,
  data: UpdateFacilityDto,
): Promise<FacilityResponse> {
  return apiRequest<FacilityResponse>(`/facilities/${id}`, {
    method: 'PATCH',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

// --- MAPPERS BETWEEN BACKEND DTOS AND FRONTEND GEO MODELS ---

export function geoJsonPolygonToLatLngArray(
  polygon: Zone['polygon'],
): Array<ZoneLatLngPoint> {
  const ring =
    polygon.type === 'Polygon'
      ? (polygon.coordinates[0] ?? [])
      : (polygon.coordinates[0]?.[0] ?? []);
  if (!ring.length) return [];

  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed =
    ring.length > 3 && first[0] === last[0] && first[1] === last[1];
  const vertices = isClosed ? ring.slice(0, -1) : ring;

  return vertices.map(([lng, lat]) => ({
    lat: Number(lat),
    lng: Number(lng),
  }));
}

export function normalizeToGeoJsonPolygon(
  rawPolygon: ZoneResponse['polygon'],
): Polygon {
  if (
    rawPolygon &&
    !Array.isArray(rawPolygon) &&
    rawPolygon.type === 'Polygon' &&
    Array.isArray(rawPolygon.coordinates)
  ) {
    return rawPolygon;
  }

  const points = Array.isArray(rawPolygon) ? rawPolygon : [];
  const coords: [number, number][] = points
    .map((pt: any) => {
      if (Array.isArray(pt) && pt.length >= 2) {
        return [Number(pt[0]), Number(pt[1])] as [number, number];
      }
      return [Number(pt?.lng), Number(pt?.lat)] as [number, number];
    })
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

  if (coords.length >= 3) {
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([first[0], first[1]]);
    }
  }

  return {
    type: 'Polygon',
    coordinates: [coords],
  };
}

export function mapZoneResponseToZone(
  raw: ZoneResponse,
  existing?: Zone,
): Zone {
  const facilityId =
    raw.facilityId ??
    raw.facilities?.[0]?.id ??
    existing?.facilityId ??
    undefined;

  return {
    id: raw.id,
    name: raw.name,
    active: raw.active !== false,
    polygon: normalizeToGeoJsonPolygon(raw.polygon),
    ...(facilityId ? { facilityId } : {}),
  };
}

export function mapFacilityResponseToFacility(
  raw: FacilityResponse,
  zones: Zone[] = [],
  existing?: Facility,
): Facility {
  const zoneObj =
    typeof raw.zone === 'object' && raw.zone !== null ? raw.zone : undefined;
  const resolvedZoneId =
    raw.zoneId ?? zoneObj?.id ?? existing?.zoneId ?? undefined;
  const matchedZone = zones.find(
    (z) => z.id === resolvedZoneId || z.facilityId === raw.id,
  );
  const resolvedZoneName =
    zoneObj?.name ??
    (typeof raw.zone === 'string' ? raw.zone : undefined) ??
    matchedZone?.name ??
    existing?.zone ??
    'Guayaquil';

  const oh = raw.openingHours ?? {};
  const operatingSchedule =
    Array.isArray(oh.days) &&
    typeof oh.open === 'string' &&
    typeof oh.close === 'string'
      ? {
          days: oh.days.map(Number),
          open: oh.open,
          close: oh.close,
        }
      : (existing?.operatingSchedule ?? {
          days: [1, 2, 3, 4, 5, 6],
          open: '08:00',
          close: '18:00',
        });

  const code =
    raw.code ||
    raw.taxId ||
    oh.code ||
    existing?.code ||
    `HUB-${raw.id.slice(0, 4).toUpperCase()}`;

  return {
    id: raw.id,
    zoneId: resolvedZoneId ?? matchedZone?.id,
    name: raw.name,
    code,
    address: raw.address,
    city: raw.city ?? existing?.city ?? 'Guayaquil',
    zone: resolvedZoneName,
    capacityMaxKgDay: Number(
      raw.dailyCapacity ?? existing?.capacityMaxKgDay ?? 1200,
    ),
    currentLoadKgDay: Number(
      raw.currentLoadKgDay ?? existing?.currentLoadKgDay ?? 0,
    ),
    activeOrders: Number(raw.activeOrders ?? existing?.activeOrders ?? 0),
    assignedDriversCount: Number(
      raw.assignedDriversCount ?? existing?.assignedDriversCount ?? 0,
    ),
    status: raw.active === false ? 'MAINTENANCE' : 'ACTIVE',
    phone: raw.phone ?? existing?.phone ?? '+593 4 555-0100',
    managerName: raw.managerName ?? existing?.managerName ?? 'Supervisor de Planta',
    acceptsCustomerDropoff: false,
    allowsCustomerPickup:
      typeof oh.allowsCustomerPickup === 'boolean'
        ? oh.allowsCustomerPickup
        : (existing?.allowsCustomerPickup ?? true),
    operatingSchedule,
    coordinates: {
      lat: Number(raw.latitude),
      lng: Number(raw.longitude),
    },
  };
}
