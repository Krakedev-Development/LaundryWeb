import { apiRequest } from './apiConfig';
import { session } from '../auth/session';
import type { Driver, DriverStatus, Facility } from '../../types';

export interface BackendDriver {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  status: DriverStatus;
  vehicle: string | null;
  plate: string | null;
  facilityId: string;
  facilityName: string;
  latitude: number | null;
  longitude: number | null;
  locationAt: string | null;
  activeLegsCount: number;
}

export interface ListDriversParams {
  facilityId?: string;
  status?: string;
}

export interface CreateDriverPayload {
  name: string;
  email: string;
  phone: string;
  temporaryPassword?: string;
  facilityId: string;
  vehicle?: string;
  plate?: string;
}

export interface UpdateDriverPayload {
  facilityId?: string;
  vehicle?: string;
  plate?: string;
  status?: string;
}

export interface CreatedUserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  facilityId: string | null;
}

// ---------------------------------------------------------------- API Requests

export async function listDrivers(
  params?: ListDriversParams,
): Promise<BackendDriver[]> {
  const search = new URLSearchParams();
  if (params?.facilityId) search.set('facilityId', params.facilityId);
  if (params?.status) search.set('status', params.status);

  const qStr = search.toString();
  const path = `/drivers${qStr ? `?${qStr}` : ''}`;

  const res = await apiRequest<BackendDriver[] | { data?: BackendDriver[] }>(
    path,
    {
      method: 'GET',
      token: session.getToken(),
    },
  );

  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
}

export async function createDriver(
  payload: CreateDriverPayload,
): Promise<CreatedUserResponse> {
  const body = {
    ...payload,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    temporaryPassword: payload.temporaryPassword?.trim() || 'Password123!',
    vehicle: payload.vehicle || 'VAN',
    plate: payload.plate ? payload.plate.trim().toUpperCase() : undefined,
  };

  return apiRequest<CreatedUserResponse>('/users/drivers', {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(body),
  });
}

export async function updateDriver(
  id: string,
  payload: UpdateDriverPayload,
): Promise<BackendDriver> {
  const body: UpdateDriverPayload = {};
  if (payload.facilityId) body.facilityId = payload.facilityId;
  if (payload.vehicle) body.vehicle = payload.vehicle.trim();
  if (payload.plate) body.plate = payload.plate.trim().toUpperCase();
  if (payload.status) body.status = payload.status;

  return apiRequest<BackendDriver>(`/drivers/${id}`, {
    method: 'PATCH',
    token: session.getToken(),
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------- Mappers

const GYE_LAT = -2.1894;
const GYE_LNG = -79.8891;

export function mapBackendDriverToDriver(
  raw: BackendDriver,
  existing?: Driver,
  facilities: Facility[] = [],
): Driver {
  const matchedFacility = facilities.find((f) => f.id === raw.facilityId);
  const facilityName =
    raw.facilityName ||
    matchedFacility?.name ||
    existing?.facilityName ||
    'Sede Operativa Guayaquil';

  const zoneId =
    matchedFacility?.zoneId || existing?.zoneId || 'ZONA-GYE-CENTRO';
  const zoneName =
    matchedFacility?.zone || existing?.zoneName || 'Guayaquil';

  let vehicleType: 'VAN' | 'MOTO' | 'CAMIONETA' = 'VAN';
  const vUpper = (raw.vehicle || existing?.vehicleType || '').toUpperCase();
  if (vUpper.includes('MOTO')) {
    vehicleType = 'MOTO';
  } else if (vUpper.includes('CAMIONETA') || vUpper.includes('PICKUP')) {
    vehicleType = 'CAMIONETA';
  }

  const lat =
    raw.latitude !== null && raw.latitude !== undefined && Number.isFinite(raw.latitude)
      ? Number(raw.latitude)
      : matchedFacility?.coordinates.lat ?? existing?.location?.lat ?? GYE_LAT;

  const lng =
    raw.longitude !== null && raw.longitude !== undefined && Number.isFinite(raw.longitude)
      ? Number(raw.longitude)
      : matchedFacility?.coordinates.lng ?? existing?.location?.lng ?? GYE_LNG;

  return {
    id: raw.id,
    name: raw.name || existing?.name || 'Chofer Operativo',
    phone: raw.phone || existing?.phone || '+593 99 999-9999',
    email: raw.email || existing?.email || '',
    avatar: existing?.avatar || '',
    vehicleType,
    vehiclePlate: (raw.plate || existing?.vehiclePlate || 'GYE-0000').toUpperCase(),
    facilityId: raw.facilityId,
    facilityName,
    zoneId,
    zoneName,
    authorizedZoneIds: [
      ...new Set([
        ...(existing?.authorizedZoneIds ?? [zoneId]),
        zoneId,
      ]),
    ],
    status: raw.status || existing?.status || 'AVAILABLE',
    activeOrders:
      raw.activeLegsCount !== undefined && raw.activeLegsCount !== null
        ? raw.activeLegsCount
        : existing?.activeOrders ?? 0,
    maxOrders: existing?.maxOrders ?? 8,
    rating: existing?.rating ?? 4.9,
    completedTripsToday: existing?.completedTripsToday ?? 0,
    location: {
      lat,
      lng,
      address: matchedFacility?.address || existing?.location?.address || facilityName,
      lastUpdated: raw.locationAt
        ? new Date(raw.locationAt).toISOString()
        : existing?.location?.lastUpdated || new Date().toISOString(),
      simulated: existing?.location?.simulated ?? false,
    },
  };
}

export async function syncDrivers(
  facilities: Facility[] = [],
  existingDrivers: Driver[] = [],
): Promise<Driver[]> {
  const backendList = await listDrivers();
  return backendList.map((raw) =>
    mapBackendDriverToDriver(
      raw,
      existingDrivers.find((d) => d.id === raw.id || d.email === raw.email),
      facilities,
    ),
  );
}
