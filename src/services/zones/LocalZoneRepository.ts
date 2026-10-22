import type {
  Zone,
  ZoneRepository,
} from '../../entities/zone/model/zone.types';
import {
  validateZone,
  validateZoneChange,
} from '../../entities/zone/model/zone.rules';
import type { Facility, Order } from '../../types';
import {
  localStorageAdapter,
  type StorageAdapter,
} from '../../shared/storage/LocalStorageAdapter';
import { encodeZones, notifyZones, readZones, ZONES_KEY } from './zoneStorage';

interface Dependencies {
  actor(): { role: string };
  facilities(): Facility[];
  orders(): Order[];
  storage?: StorageAdapter;
}

export class LocalZoneRepository implements ZoneRepository {
  constructor(private dependencies: Dependencies) {}
  list() {
    return readZones(this.dependencies.storage ?? localStorageAdapter);
  }
  save(value: Zone) {
    if (this.dependencies.actor().role !== 'ADMIN')
      throw Error('Solo el Administrador puede configurar zonas.');
    const zone = structuredClone({ ...value, name: value.name.trim() });
    validateZone(zone);
    const zones = this.list(),
      previous = zones.find((item) => item.id === zone.id);
    if (
      zones.some(
        (item) =>
          item.id !== zone.id &&
          item.name.toLocaleLowerCase() === zone.name.toLocaleLowerCase(),
      )
    )
      throw Error('Ya existe una zona con ese nombre.');
    if (previous) {
      zone.facilityId = previous.facilityId;
      validateZoneChange(
        previous,
        zone,
        this.dependencies.facilities(),
        this.dependencies.orders(),
      );
    } else delete zone.facilityId;
    const next = previous
      ? zones.map((item) => (item.id === zone.id ? zone : item))
      : [...zones, zone];
    (this.dependencies.storage ?? localStorageAdapter).setItem(
      ZONES_KEY,
      encodeZones(next),
    );
    notifyZones();
    return zone;
  }
}
