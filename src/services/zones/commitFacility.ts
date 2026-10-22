import type { Facility } from '../../types';
import { validatePinnedFacility } from '../../entities/zone/model/zone.rules';
import {
  commitLocalRecords,
  localStorageAdapter,
} from '../../shared/storage/LocalStorageAdapter';
import { encodeZones, notifyZones, readZones, ZONES_KEY } from './zoneStorage';

export function commitFacility(
  facilities: Facility[],
  facility: Facility,
  facilityKey: string,
) {
  const zones = readZones();
  validatePinnedFacility(facility, zones);
  const next = zones.map((zone) =>
    zone.id === facility.zoneId && !zone.facilityId
      ? { ...zone, facilityId: facility.id }
      : zone,
  );
  commitLocalRecords(localStorageAdapter, {
    [facilityKey]: JSON.stringify(facilities),
    [ZONES_KEY]: encodeZones(next),
  });
  notifyZones();
}
