import type { Zone } from '../../entities/zone/model/zone.types';
import { validateZone } from '../../entities/zone/model/zone.rules';
import { SERVICE_AREAS } from '../geo/demo';
import {
  localStorageAdapter,
  type StorageAdapter,
} from '../../shared/storage/LocalStorageAdapter';

export const ZONES_KEY = 'lw_zones_v1';
const listeners = new Set<() => void>();
export const subscribeZones = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const notifyZones = () => listeners.forEach((listener) => listener());
export const encodeZones = (zones: Zone[]) =>
  JSON.stringify({ version: 1, zones });

export function readZones(
  storage: StorageAdapter = localStorageAdapter,
): Zone[] {
  const raw = storage.getItem(ZONES_KEY);
  if (!raw) return structuredClone(SERVICE_AREAS);
  const saved = JSON.parse(raw);
  if (saved.version !== 1 || !Array.isArray(saved.zones))
    throw Error('No se pudieron leer las zonas guardadas.');
  saved.zones.forEach(validateZone);
  if (
    new Set(saved.zones.map((zone: Zone) => zone.id)).size !==
    saved.zones.length
  )
    throw Error('Los identificadores de zona guardados no son válidos.');
  return saved.zones;
}

export const readCoverageAreas = () => {
  try {
    return readZones().filter(
      (zone): zone is Zone & { facilityId: string } => !!zone.facilityId,
    );
  } catch {
    return [];
  }
};
