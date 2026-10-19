import type { Zone } from '../../entities/zone/model/zone.types';
import type { Coordinates } from '../../services/geo/geo.types';
export interface ZoneMapOptions {
  zones?: Zone[];
  vertices?: Coordinates[];
  onVertexMove?: (index: number, point: Coordinates) => void;
  onClosePolygon?: () => void;
}
