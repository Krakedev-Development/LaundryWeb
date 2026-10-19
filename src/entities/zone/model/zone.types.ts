import type { Polygon, MultiPolygon } from 'geojson';

export interface Zone {
  id: string;
  name: string;
  polygon: Polygon | MultiPolygon;
  active: boolean;
  facilityId?: string;
}

export interface ZoneRepository {
  list(): Zone[];
  save(zone: Zone): Zone;
}
